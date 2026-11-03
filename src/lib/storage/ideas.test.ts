import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createIdea,
  EMPTY_CONTEXT,
  getIdea,
  isValidId,
  listIdeas,
  listIdeasWithProgress,
  StorageError,
  trashIdea,
  updateIdea,
  updateIdeaContext,
} from '.';
import { getDocs } from './docs';
import { UNFILED } from './folders';
import { indexMarkdown } from './index-file';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

describe('createIdea', () => {
  it('제목 · 메모로 idea.md를 만들고 Idea를 돌려준다', async () => {
    const idea = await createIdea({ title: '  동네 클래스 추천  ', memo: '주말 원데이' });

    expect(isValidId(idea.id)).toBe(true);
    expect(idea.title).toBe('동네 클래스 추천');
    expect(idea.memo).toBe('주말 원데이');
    expect(idea.createdAt).toBe(idea.updatedAt);

    const raw = await fs.readFile(path.join(dir, 'ideas', idea.id, 'idea.md'), 'utf8');
    expect(raw).toContain('title: 동네 클래스 추천');
    expect(raw).toContain('version: 3');
  });

  it('빈 제목은 화면에 보여 줄 StorageError로 거부한다', async () => {
    await expect(createIdea({ title: '   ', memo: '' })).rejects.toThrow(StorageError);
    await expect(createIdea({ title: '   ', memo: '' })).rejects.toThrow('제목');
  });
});

describe('listIdeas', () => {
  it('데이터 폴더가 없어도 빈 목록', async () => {
    process.env.HATCH_DATA_DIR = path.join(dir, 'none');
    expect(await listIdeas()).toEqual({ ideas: [], unreadable: 0 });
  });

  it('손으로 쓴 따옴표 없는 날짜도 읽는다', async () => {
    const id = '20261028-0900-hand';
    await fs.mkdir(path.join(dir, 'ideas', id), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'ideas', id, 'idea.md'),
      '---\nid: 20261028-0900-hand\ntitle: 손으로 씀\ncreatedAt: 2026-10-28T09:00:00.000Z\nupdatedAt: 2026-10-28T09:00:00.000Z\nversion: 1\n---\n메모\n',
    );

    const { ideas, unreadable } = await listIdeas();
    expect(unreadable).toBe(0);
    expect(ideas[0]).toMatchObject({ title: '손으로 씀', memo: '메모', createdAt: '2026-10-28T09:00:00.000Z' });
  });

  it('이름이 id 형식이 아닌 폴더는 건너뛰고 개수를 센다 (목록 · 진행 배지 모두)', async () => {
    await createIdea({ title: '정상', memo: '' });
    const odd = path.join(dir, 'ideas', 'my-idea');
    await fs.mkdir(odd, { recursive: true });
    await fs.writeFile(
      path.join(odd, 'idea.md'),
      "---\ntitle: 손으로 만든 폴더\ncreatedAt: '2026-10-28T09:00:00.000Z'\nupdatedAt: '2026-10-28T09:00:00.000Z'\n---\n",
    );

    expect(await listIdeas()).toMatchObject({ unreadable: 1 });
    const { items, unreadable } = await listIdeasWithProgress();
    expect(items).toHaveLength(1);
    expect(unreadable).toBe(1);
  });

  it('최신순으로 돌려준다', async () => {
    const a = await createIdea({ title: 'A', memo: '' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createIdea({ title: 'B', memo: '' });

    const { ideas } = await listIdeas();
    expect(ideas.map((i) => i.id)).toEqual([b.id, a.id]);
  });

  it('머리말이 깨진 파일은 건너뛰고 개수를 센다', async () => {
    await createIdea({ title: '정상', memo: '' });
    const broken = path.join(dir, 'ideas', '20261028-0000-zzzz');
    await fs.mkdir(broken, { recursive: true });
    await fs.writeFile(path.join(broken, 'idea.md'), '---\ntitle: [깨짐\n---\n');

    const { ideas, unreadable } = await listIdeas();
    expect(ideas).toHaveLength(1);
    expect(unreadable).toBe(1);
  });
});

describe('getIdea · updateIdea', () => {
  it('없는 id는 null', async () => {
    expect(await getIdea('20261028-0000-abcd')).toBeNull();
  });

  it('잘못된 id는 거부한다 (경로 조작 방지)', async () => {
    await expect(getIdea('../etc')).rejects.toThrow('id');
  });

  it('수정하면 내용과 updatedAt이 바뀐다', async () => {
    const idea = await createIdea({ title: '처음', memo: '' });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateIdea(idea.id, { title: '고친 제목', memo: '메모 추가' });

    expect(updated.title).toBe('고친 제목');
    expect(updated.memo).toBe('메모 추가');
    expect(updated.createdAt).toBe(idea.createdAt);
    expect(updated.updatedAt > idea.updatedAt).toBe(true);
    expect(await getIdea(idea.id)).toEqual(updated);
  });

  it('빈 제목으로 수정은 거부한다', async () => {
    const idea = await createIdea({ title: '처음', memo: '' });
    await expect(updateIdea(idea.id, { title: ' ' })).rejects.toThrow('제목');
  });
});

describe('trashIdea', () => {
  it('.trash로 옮기고 목록에서 사라진다', async () => {
    const idea = await createIdea({ title: '버릴 것', memo: '' });
    await trashIdea(idea.id);

    expect((await listIdeas()).ideas).toHaveLength(0);
    await expect(fs.stat(path.join(dir, '.trash', idea.id, 'idea.md'))).resolves.toBeTruthy();
  });

  it('이미 없는 아이디어는 조용히 넘어간다 (다른 탭에서 지운 경우)', async () => {
    await expect(trashIdea('20261028-0000-gone')).resolves.toBeUndefined();
  });

  it('휴지통에 같은 id가 있으면 뒤에 번호를 붙인다', async () => {
    const idea = await createIdea({ title: '버릴 것', memo: '' });
    await fs.mkdir(path.join(dir, '.trash', idea.id), { recursive: true });
    await trashIdea(idea.id);

    await expect(fs.stat(path.join(dir, '.trash', `${idea.id}-1`))).resolves.toBeTruthy();
  });
});

describe('listIdeasWithProgress', () => {
  it('아이디어마다 진행 배지를 붙인다', async () => {
    const idea = await createIdea({ title: '진행', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, 'plan.md'), '# 기획안');

    const { items } = await listIdeasWithProgress();
    expect(items).toEqual([{ idea, progress: '기획안', done: 1, total: 7, evidence: 0, decided: 0, prdReviewed: false }]);
  });

  it('근거 · 정한 결정 · PRD 리뷰 수는 실제 파일에서 (보류 · 제안은 결정 수에 안 넣음)', async () => {
    const { saveEvidence, saveDecision } = await import('.');
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveEvidence(idea.id, { text: '연다', source: 'voc', sourceNote: '', question: '' });
    await saveDecision(idea.id, { question: 'a', status: 'decided', answer: 'y', reason: 'r', from: 'manual' });
    await saveDecision(idea.id, { question: 'b', status: 'deferred', answer: '', reason: 'r', from: 'manual' });
    await saveDecision(idea.id, { question: 'c', status: 'proposed', answer: 'y', reason: 'r', from: 'manual' });
    const { items } = await listIdeasWithProgress();
    expect(items[0]).toMatchObject({ evidence: 1, decided: 1, prdReviewed: false });
  });

  it('문서가 없으면 0개', async () => {
    const idea = await createIdea({ title: '빈', memo: '' });

    const { items } = await listIdeasWithProgress();
    expect(items).toEqual([{ idea, progress: '아이디어', done: 0, total: 7, evidence: 0, decided: 0, prdReviewed: false }]);
  });
});

describe('getDocs', () => {
  it('7칸을 고정 순서로, 있는 파일만 내용을 채운다', async () => {
    const idea = await createIdea({ title: '문서', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, 'prd.md'), '# PRD');

    const docs = await getDocs(idea.id);
    expect(docs.map((d) => d.key)).toEqual(['plan', 'roadmap', 'prd', 'spec', 'data', 'dev-prompt', 'design-prompt']);
    expect(docs.find((d) => d.key === 'prd')?.content).toBe('# PRD');
    expect(docs.find((d) => d.key === 'plan')?.content).toBeNull();
  });
});

describe('맥락', () => {
  it('새 아이디어는 빈 맥락, 저장하면 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(idea.context).toEqual({ customer: '', goal: '', constraints: '', facts: '' });
    await updateIdeaContext(idea.id, { customer: '  직장인  ', goal: '예약 전환율', constraints: '', facts: '' });
    const read = await getIdea(idea.id);
    expect(read?.context).toEqual({ customer: '직장인', goal: '예약 전환율', constraints: '', facts: '' });
    expect(read?.title).toBe('x');
  });
  it('1판 idea.md(context 없음)는 빈 맥락으로 읽는다', async () => {
    const id = '20261029-0900-abcd';
    await fs.mkdir(path.join(dir, 'ideas', id), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'ideas', id, 'idea.md'),
      "---\nid: 20261029-0900-abcd\ntitle: 옛 아이디어\ncreatedAt: '2026-10-29T00:00:00.000Z'\nupdatedAt: '2026-10-29T00:00:00.000Z'\nversion: 1\n---\n메모\n",
    );
    expect((await getIdea(id))?.context).toEqual({ customer: '', goal: '', constraints: '', facts: '' });
  });
  it('1,000자 넘는 칸은 거부', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(
      updateIdeaContext(idea.id, { customer: 'a'.repeat(1001), goal: '', constraints: '', facts: '' }),
    ).rejects.toThrow('맥락 칸은 1,000자까지예요.');
  });
  it('제목 · 메모를 고쳐도 맥락은 그대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await updateIdeaContext(idea.id, { customer: '직장인', goal: '', constraints: '', facts: '' });
    await updateIdea(idea.id, { memo: '새 메모' });
    expect((await getIdea(idea.id))?.context.customer).toBe('직장인');
  });
});

describe('폴더', () => {
  it('새 아이디어는 미분류, 폴더를 정하면 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(idea.folder).toBe('');
    await updateIdea(idea.id, { folder: '  퇴근 후   취미 ' });
    expect((await getIdea(idea.id))!.folder).toBe('퇴근 후 취미');
  });

  it('만들 때 폴더를 정할 수 있고, 미분류는 빈 값', async () => {
    expect((await createIdea({ title: 'a', memo: '', folder: '회의' })).folder).toBe('회의');
    expect((await createIdea({ title: 'b', memo: '', folder: UNFILED })).folder).toBe('');
  });

  it('30자 넘는 이름은 거부', async () => {
    await expect(createIdea({ title: 'x', memo: '', folder: '가'.repeat(31) })).rejects.toThrow(StorageError);
  });

  it('2판 idea.md(folder 없음)는 미분류로 읽는다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'idea.md');
    await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace(/^folder:.*\n/m, '').replace('version: 3', 'version: 2'));
    expect((await getIdea(idea.id))!.folder).toBe('');
  });

  it('폴더를 안 넘기고 고치면 폴더는 그대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '', folder: '회의' });
    await updateIdea(idea.id, { title: 'y' });
    expect((await getIdea(idea.id))!.folder).toBe('회의');
  });
});

describe('목록.md', () => {
  const read = () => fs.readFile(path.join(dir, '목록.md'), 'utf8');

  it('만들면 쓰이고, 폴더별 · 미분류 맨 끝 · 링크', async () => {
    const a = await createIdea({ title: '클래스 추천', memo: '퇴근길 도예\n둘째 줄', folder: '취미' });
    const b = await createIdea({ title: '회의록', memo: '', folder: '' });
    const md = await read();
    expect(md.split('\n').slice(0, 2)).toEqual(['# Hatch 아이디어 목록', '자동으로 만든 파일이에요. 고쳐도 다음 저장 때 다시 쓰여요.']);
    expect(md.indexOf('## 취미')).toBeLessThan(md.indexOf('## 미분류'));
    expect(md).toContain(`- [클래스 추천](ideas/${a.id}/idea.md) — 퇴근길 도예`);
    expect(md).toContain(`- [회의록](ideas/${b.id}/idea.md)`);
  });

  it('고치거나 휴지통으로 보내면 다시 쓰인다', async () => {
    const a = await createIdea({ title: '처음', memo: '' });
    await updateIdea(a.id, { title: '바꿈' });
    expect(await read()).toContain('[바꿈]');
    await trashIdea(a.id);
    expect(await read()).not.toContain('[바꿈]');
  });

  it('메모 첫 줄은 40자까지', () => {
    const md = indexMarkdown([{ id: '20261029-0000-aaaa', title: 't', memo: '가'.repeat(50), createdAt: '', updatedAt: '', context: EMPTY_CONTEXT, folder: '' }]);
    expect(md).toContain(`— ${'가'.repeat(40)}…`);
  });

  const at = (id: string, memo: string, updatedAt: string, folder = '') =>
    ({ id, title: id, memo, createdAt: '', updatedAt, context: EMPTY_CONTEXT, folder });

  it('자른 끝 공백은 빼고, 이모지는 반으로 안 잘린다', () => {
    const md = indexMarkdown([
      at('a', `${'가'.repeat(39)} 나머지`, ''),
      at('b', `${'가'.repeat(39)}😀😀`, ''),
    ]);
    expect(md).toContain(`— ${'가'.repeat(39)}…`);
    expect(md).toContain(`— ${'가'.repeat(39)}😀…`);
  });

  it('폴더 안은 최근 수정순', () => {
    const md = indexMarkdown([at('old', '', '2026-10-01', '취미'), at('new', '', '2026-10-29', '취미')]);
    expect(md.indexOf('[new]')).toBeLessThan(md.indexOf('[old]'));
  });
});
