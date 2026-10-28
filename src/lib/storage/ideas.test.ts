import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getDocs, getIdea, isValidId, listIdeas, trashIdea, updateIdea } from '.';

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
    expect(raw).toContain('version: 1');
  });

  it('빈 제목은 거부한다', async () => {
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

  it('휴지통에 같은 id가 있으면 뒤에 번호를 붙인다', async () => {
    const idea = await createIdea({ title: '버릴 것', memo: '' });
    await fs.mkdir(path.join(dir, '.trash', idea.id), { recursive: true });
    await trashIdea(idea.id);

    await expect(fs.stat(path.join(dir, '.trash', `${idea.id}-1`))).resolves.toBeTruthy();
  });
});

describe('getDocs', () => {
  it('6칸을 고정 순서로, 있는 파일만 내용을 채운다', async () => {
    const idea = await createIdea({ title: '문서', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, 'prd.md'), '# PRD');

    const docs = await getDocs(idea.id);
    expect(docs.map((d) => d.key)).toEqual(['plan', 'curriculum', 'prd', 'spec', 'dev-prompt', 'design-prompt']);
    expect(docs.find((d) => d.key === 'prd')?.content).toBe('# PRD');
    expect(docs.find((d) => d.key === 'plan')?.content).toBeNull();
  });
});
