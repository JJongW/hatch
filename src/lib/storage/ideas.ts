import 'server-only';

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';

import { assertValidId, newId } from './ids';
import { DOC_STEPS, IDEA_FILE_VERSION, type Doc, type Idea } from './types';

/** 매 호출마다 읽는다 (테스트 · .env 변경 반영). */
function dataDir() {
  const dir = process.env.HATCH_DATA_DIR?.trim() || '~/Hatch';
  return dir.startsWith('~') ? path.join(os.homedir(), dir.slice(1)) : dir;
}

const ideasDir = () => path.join(dataDir(), 'ideas');
const ideaDir = (id: string) => path.join(ideasDir(), id);
const ideaFile = (id: string) => path.join(ideaDir(id), 'idea.md');

const isMissing = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT';

function cleanTitle(title: string) {
  const t = title.trim();
  if (!t) throw new Error('제목을 적어 주세요.');
  return t;
}

async function writeIdea(idea: Idea) {
  const { memo, ...front } = idea;
  await fs.mkdir(ideaDir(idea.id), { recursive: true });
  await fs.writeFile(ideaFile(idea.id), matter.stringify(memo, { ...front, version: IDEA_FILE_VERSION }));
}

/** 머리말이 깨졌거나 필수 칸이 없으면 throw */
async function readIdea(id: string): Promise<Idea> {
  const { data, content } = matter(await fs.readFile(ideaFile(id), 'utf8'));
  const { title } = data;
  // 손으로 고친 파일은 따옴표 없는 날짜가 YAML Date로 읽힌다
  const [createdAt, updatedAt] = [data.createdAt, data.updatedAt].map((v) => (v instanceof Date ? v.toISOString() : v));
  if (typeof title !== 'string' || typeof createdAt !== 'string' || typeof updatedAt !== 'string') {
    throw new Error(`idea.md 머리말이 올바르지 않아요: ${id}`);
  }
  return { id, title, memo: content.replace(/^\n/, '').trimEnd(), createdAt, updatedAt };
}

export async function listIdeas(): Promise<{ ideas: Idea[]; unreadable: number }> {
  let ids: string[];
  try {
    ids = (await fs.readdir(ideasDir(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    if (isMissing(e)) return { ideas: [], unreadable: 0 };
    throw e;
  }

  const results = await Promise.allSettled(ids.map(readIdea));
  const ideas = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ideas, unreadable: results.length - ideas.length };
}

export async function getIdea(id: string): Promise<Idea | null> {
  assertValidId(id);
  try {
    return await readIdea(id);
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

export async function createIdea(input: { title: string; memo: string }): Promise<Idea> {
  const now = new Date();
  const at = now.toISOString();
  const idea: Idea = { id: newId(now), title: cleanTitle(input.title), memo: input.memo.trim(), createdAt: at, updatedAt: at };
  await writeIdea(idea);
  return idea;
}

export async function updateIdea(id: string, patch: { title?: string; memo?: string }): Promise<Idea> {
  const current = await getIdea(id);
  if (!current) throw new Error('아이디어를 찾을 수 없어요.');
  const next: Idea = {
    ...current,
    title: patch.title === undefined ? current.title : cleanTitle(patch.title),
    memo: patch.memo === undefined ? current.memo : patch.memo.trim(),
    updatedAt: new Date().toISOString(),
  };
  await writeIdea(next);
  return next;
}

/** 지우지 않고 `.trash/`로 옮긴다. 같은 이름이 있으면 `-1`, `-2`… */
export async function trashIdea(id: string): Promise<void> {
  assertValidId(id);
  const trash = path.join(dataDir(), '.trash');
  await fs.mkdir(trash, { recursive: true });

  let target = path.join(trash, id);
  for (let n = 1; await fs.stat(target).then(() => true, () => false); n++) {
    target = path.join(trash, `${id}-${n}`);
  }
  await fs.rename(ideaDir(id), target);
}

export async function getDocs(id: string): Promise<Doc[]> {
  assertValidId(id);
  return Promise.all(
    DOC_STEPS.map(async (step) => {
      const content = await fs.readFile(path.join(ideaDir(id), step.file), 'utf8').catch((e) => {
        if (isMissing(e)) return null;
        throw e;
      });
      return { ...step, content };
    }),
  );
}
