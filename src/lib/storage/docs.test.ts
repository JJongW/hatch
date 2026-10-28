import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearRunning,
  createIdea,
  getDocs,
  getRunning,
  hashOf,
  ideaSource,
  markRunning,
  saveDoc,
  StorageError,
  updateDocBody,
  updateIdea,
} from '.';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

describe('getDocs', () => {
  it('머리말을 빼고 본문만, 앞 문서가 그대로면 stale=false', async () => {
    const idea = await createIdea({ title: '동네 클래스', memo: '주말' });
    await saveDoc(idea.id, 'plan', '# 기획안', { sourceHash: hashOf(ideaSource(idea)) });
    const plan = (await getDocs(idea.id)).find((d) => d.key === 'plan')!;
    expect(plan.content).toBe('# 기획안');
    expect(plan.stale).toBe(false);
  });

  it('아이디어를 고치면 기획안이 stale', async () => {
    const idea = await createIdea({ title: '동네 클래스', memo: '' });
    await saveDoc(idea.id, 'plan', '# 기획안', { sourceHash: hashOf(ideaSource(idea)) });
    await updateIdea(idea.id, { memo: '평일 저녁도' });
    expect((await getDocs(idea.id))[0].stale).toBe(true);
  });

  it('머리말 없이 손으로 쓴 문서는 stale=false', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, 'roadmap.md'), '# 손으로');
    const roadmap = (await getDocs(idea.id)).find((d) => d.key === 'roadmap')!;
    expect(roadmap).toMatchObject({ content: '# 손으로', stale: false });
  });
});

describe('getDocs 방어', () => {
  it('머리말 YAML이 깨져도 throw하지 않고 본문으로 읽는다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, 'plan.md'), '---\ntitle: [깨짐\n---\n본문');
    const plan = (await getDocs(idea.id))[0];
    expect(plan.content).not.toBeNull();
    expect(plan.stale).toBe(false);
  });

  it('앞 문서를 고치면 뒤 문서가 stale (체인)', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    await saveDoc(idea.id, 'roadmap', '로드맵', { sourceHash: hashOf('기획') });
    expect((await getDocs(idea.id))[1].stale).toBe(false);
    await updateDocBody(idea.id, 'plan', '고친 기획');
    expect((await getDocs(idea.id))[1].stale).toBe(true);
  });
});

describe('saveDoc · updateDocBody', () => {
  it('---로 시작하는 본문도 그대로 저장된다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '---\n\n# 제목', { sourceHash: 'a' });
    expect((await getDocs(idea.id))[0].content).toBe('---\n\n# 제목');
    await updateDocBody(idea.id, 'plan', '---\n\n# 고침');
    expect((await getDocs(idea.id))[0].content).toBe('---\n\n# 고침');
  });

  it('덮어쓰기 전 이전 판을 .history로 옮긴다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '첫 판', { sourceHash: 'a' });
    await saveDoc(idea.id, 'plan', '둘째 판', { sourceHash: 'b' });
    const history = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatch(/^plan-\d{8}T\d{6}/);
  });

  it('편집은 본문만 바꾸고 sourceHash는 유지', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '원본', { sourceHash: hashOf(ideaSource(idea)) });
    await updateDocBody(idea.id, 'plan', '고친 본문');
    const plan = (await getDocs(idea.id))[0];
    expect(plan).toMatchObject({ content: '고친 본문', stale: false });
  });

  it('없는 문서 편집은 StorageError', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(updateDocBody(idea.id, 'plan', 'y')).rejects.toThrow(StorageError);
  });
});

describe('running', () => {
  it('표시 → 읽기 → 지우기', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await markRunning(idea.id, 'plan');
    expect(await getRunning(idea.id)).toMatchObject({ key: 'plan' });
    await clearRunning(idea.id);
    expect(await getRunning(idea.id)).toBeNull();
  });

  it('10분 넘은 표시는 무시', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const old = new Date(Date.now() - 11 * 60_000).toISOString();
    await fs.writeFile(path.join(dir, 'ideas', idea.id, '.running.json'), JSON.stringify({ key: 'plan', startedAt: old }));
    expect(await getRunning(idea.id)).toBeNull();
  });

  it.each([
    ['깨진 JSON', '{nope'],
    ['startedAt 없음', JSON.stringify({ key: 'plan' })],
    ['모르는 key', JSON.stringify({ key: 'zzz', startedAt: new Date().toISOString() })],
  ])('%s는 null', async (_n, content) => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, '.running.json'), content);
    expect(await getRunning(idea.id)).toBeNull();
  });
});
