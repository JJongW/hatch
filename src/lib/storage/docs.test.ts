import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearRunning,
  createIdea,
  getDocs,
  getRunning,
  EMPTY_CONTEXT,
  hashOf,
  ideaSource,
  markRunning,
  projectBlock,
  saveDecision,
  saveDoc,
  StorageError,
  updateDocBody,
  updateIdea,
  updateIdeaContext,
  type Decision,
  type DocKey,
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

describe('ideaSource · projectBlock', () => {
  const d = (over: Partial<Decision>): Decision => ({
    id: 'ab12', question: '지역은?', status: 'decided', answer: '성수동', reason: '공방이 많다', from: 'plan', decidedAt: '2026-10-29T00:00:00.000Z', ...over,
  });
  it('정한 것 · 보류한 것 블록, 맥락 다음 순서', () => {
    const block = projectBlock({ ...EMPTY_CONTEXT, customer: '직장인' }, [
      d({}),
      d({ id: 'cd34', question: '결제는?', status: 'deferred', answer: '', reason: '파트너 미정' }),
    ]);
    expect(block).toBe(
      '### 프로젝트 맥락\n- 목표 고객: 직장인\n\n### 정한 것\n- 지역은? → 성수동 (이유: 공방이 많다)\n\n### 보류한 것\n- 결제는? (보류 이유: 파트너 미정)',
    );
    expect(projectBlock(EMPTY_CONTEXT, [])).toBe('');
  });
  it('결정을 남기면 기획안이 stale', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    await saveDecision(idea.id, { question: '지역은?', status: 'decided', answer: '성수동', reason: '많다', from: 'plan' });
    expect((await getDocs(idea.id))[0].stale).toBe(true);
  });
  it('맥락이 비면 지금 형식과 같다', () => {
    expect(ideaSource({ title: '동네 클래스', memo: '주말', context: EMPTY_CONTEXT })).toBe('# 동네 클래스\n\n주말');
    expect(projectBlock(EMPTY_CONTEXT)).toBe('');
  });
  it('채운 칸만, 정해진 순서로, 줄바꿈은 한 칸 공백으로', () => {
    const ctx = { customer: '', goal: '예약\n전환율', constraints: '', facts: '조사 3건' };
    expect(projectBlock(ctx)).toBe('### 프로젝트 맥락\n- 목표 지표: 예약 전환율\n- 이미 아는 사실: 조사 3건');
    expect(ideaSource({ title: 't', memo: 'm', context: ctx })).toBe(`# t\n\nm\n\n${projectBlock(ctx)}`);
  });
  it('맥락을 바꾸면 기획안이 stale', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    expect((await getDocs(idea.id))[0].stale).toBe(false);
    await updateIdeaContext(idea.id, { customer: '직장인', goal: '', constraints: '', facts: '' });
    expect((await getDocs(idea.id))[0].stale).toBe(true);
  });
});

describe('문서 자리 docs/', () => {
  const at = (id: string, ...p: string[]) => path.join(dir, 'ideas', id, ...p);
  const exists = (p: string) => fs.stat(p).then(() => true, () => false);

  it('새로 만든 문서는 docs/에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '# 기획안', { sourceHash: 'h' });
    expect(await exists(at(idea.id, 'docs', 'plan.md'))).toBe(true);
    expect(await exists(at(idea.id, 'plan.md'))).toBe(false);
  });

  it('예전 자리에만 있으면 그대로 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(at(idea.id, 'plan.md'), '# 예전');
    expect((await getDocs(idea.id))[0].content).toBe('# 예전');
  });

  it('예전 자리 문서를 고치면 docs/로 가고, 이전 판은 .history/에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(at(idea.id, 'plan.md'), '# 예전');
    await updateDocBody(idea.id, 'plan', '# 새로');
    expect(await exists(at(idea.id, 'plan.md'))).toBe(false);
    expect(await fs.readFile(at(idea.id, 'docs', 'plan.md'), 'utf8')).toContain('# 새로');
    expect((await fs.readdir(at(idea.id, '.history'))).some((f) => f.startsWith('plan-'))).toBe(true);
  });

  it('두 곳에 다 있으면 docs/가 이긴다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(at(idea.id, 'plan.md'), '# 예전');
    await fs.mkdir(at(idea.id, 'docs'));
    await fs.writeFile(at(idea.id, 'docs', 'plan.md'), '# 새 자리');
    expect((await getDocs(idea.id))[0].content).toBe('# 새 자리');
  });
});

describe('바뀐 원인 · 초안 · 이전 버전 (spec 2026-11-03 §2)', () => {
  const planInputs = async (id: string) => {
    const { inputHashes, getIdea, listDecisions } = await import('.');
    const idea = (await getIdea(id))!;
    return inputHashes('plan', { idea, decisions: await listDecisions(id), evidence: [], bodyOf: () => null });
  };

  it('입력 조각별로 무엇이 바뀌었는지: 결정만 바꾸면 decisions', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)), inputs: await planInputs(idea.id) });
    expect((await getDocs(idea.id))[0].changes).toEqual([]);
    await saveDecision(idea.id, { question: '지역', status: 'decided', answer: '성수', reason: '많다', from: 'manual' });
    expect((await getDocs(idea.id))[0]).toMatchObject({ stale: true, changes: ['decisions'] });
  });

  it('새 형식 기획안: 근거만 더하면 evidence, 다시 초안을 만들면 앞 초안은 이전 버전 폴더로', async () => {
    const { saveEvidence, saveDraft } = await import('.');
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)), inputs: await planInputs(idea.id) });
    await saveEvidence(idea.id, { text: '퇴근 후 연다', source: 'interview', sourceNote: '', question: '' });
    expect((await getDocs(idea.id))[0].changes).toEqual(['evidence']);
    await saveDraft(idea.id, 'plan', '초안1', { sourceHash: 'a' });
    await saveDraft(idea.id, 'plan', '초안2', { sourceHash: 'b' });
    expect((await getDocs(idea.id))[0].draft?.content).toBe('초안2');
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.filter((f) => f.startsWith('plan-draft-'))).toHaveLength(1);
  });

  it('예전 문서(inputs 없음)는 sourceHash로만 보고 원인은 unknown', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    await updateIdea(idea.id, { title: 'y', memo: '', folder: '' });
    expect((await getDocs(idea.id))[0].changes).toEqual(['unknown']);
  });

  it('예전 뒤 문서(inputs 없음)는 앞 문서가 바뀐 것으로 안다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    await saveDoc(idea.id, 'roadmap', '로드맵', { sourceHash: hashOf('기획') });
    await updateDocBody(idea.id, 'plan', '고친 기획');
    expect((await getDocs(idea.id)).find((d) => d.key === 'roadmap')?.changes).toEqual(['doc:plan']);
  });

  it('PRD는 extra(기획안)가 바뀌어도 알린다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    await saveDoc(idea.id, 'roadmap', '로드맵', { sourceHash: hashOf('기획') });
    await saveDoc(idea.id, 'prd', 'PRD', { sourceHash: hashOf('로드맵'), inputs: { 'doc:roadmap': hashOf('로드맵'), 'doc:plan': hashOf('기획') } });
    await updateDocBody(idea.id, 'plan', '고친 기획');
    const docs = await getDocs(idea.id);
    expect(docs.find((d) => d.key === 'prd')?.changes).toEqual(['doc:plan']);
    expect(docs.find((d) => d.key === 'plan')?.editedAt).toBeDefined();
  });

  it('초안: 저장해도 지금 판은 그대로, 적용하면 바뀌고 이전 판은 이전 버전으로', async () => {
    const { saveDraft, applyDraft, readVersion } = await import('.');
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '첫 판', { sourceHash: 'a' });
    await saveDraft(idea.id, 'plan', '새 판', { sourceHash: 'b' });
    let plan = (await getDocs(idea.id))[0];
    expect([plan.content, plan.draft?.content]).toEqual(['첫 판', '새 판']);
    await applyDraft(idea.id, 'plan');
    plan = (await getDocs(idea.id))[0];
    expect([plan.content, plan.draft, plan.editedAt]).toEqual(['새 판', null, undefined]);
    expect(plan.versions).toHaveLength(1);
    expect(await readVersion(idea.id, 'plan', plan.versions[0].name)).toBe('첫 판');
    expect(plan.versions[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('고쳐서 적용하면 고친 본문 + 고친 표시, 유지하면 초안만 이전 버전 폴더로 (지우지 않음)', async () => {
    const { saveDraft, applyDraft, keepCurrent } = await import('.');
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '첫 판', { sourceHash: 'a' });
    await saveDraft(idea.id, 'plan', '새 판', { sourceHash: 'b' });
    await applyDraft(idea.id, 'plan', '새 판 + 내 수정');
    expect((await getDocs(idea.id))[0]).toMatchObject({ content: '새 판 + 내 수정', draft: null });
    expect((await getDocs(idea.id))[0].editedAt).toBeDefined();
    await saveDraft(idea.id, 'plan', '또 새 판', { sourceHash: 'c' });
    await keepCurrent(idea.id, 'plan');
    expect((await getDocs(idea.id))[0]).toMatchObject({ content: '새 판 + 내 수정', draft: null });
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.filter((f) => f.startsWith('plan-draft-'))).toHaveLength(2);
    await expect(applyDraft(idea.id, 'plan')).rejects.toThrow('적용할 새 판이 없어요');
  });

  it('이전 버전 이름은 목록 모양만 받는다', async () => {
    const { readVersion } = await import('.');
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(readVersion(idea.id, 'plan', '../idea.md')).rejects.toThrow('이전 버전을 찾을 수 없어요.');
    await expect(readVersion(idea.id, 'plan', 'roadmap-20261103T000000-abcd.md')).rejects.toThrow('이전 버전을 찾을 수 없어요.');
    // key도 클라이언트가 바꿀 수 있다: 정규식 · 경로에 넣기 전에 막는다
    await expect(readVersion(idea.id, '.*' as DocKey, '../../x-20261103T000000-abcd.md')).rejects.toThrow('모르는 문서예요.');
    const { applyDraft } = await import('.');
    await expect(applyDraft(idea.id, '../x' as DocKey)).rejects.toThrow('모르는 문서예요.');
  });

  it('근거가 없으면 기획안 입력은 예전과 같다 (기존 해시 유지)', async () => {
    const idea = await createIdea({ title: 'x', memo: 'm' });
    expect(ideaSource(idea, [], [])).toBe(ideaSource(idea));
    const ev = { id: 'e1', text: '연다', source: 'voc' as const, sourceNote: 'A', question: '', collectedAt: '' };
    expect(ideaSource(idea, [], [ev])).toContain('### 확인한 근거');
    expect(ideaSource(idea, [], [ev])).toContain('- 연다 (출처: VOC, A)');
  });
});
