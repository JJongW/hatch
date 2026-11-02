import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { assertValidId, isValidId, newId } from './ids';
import { getDocs } from './docs';
import { FOLDER_MAX, UNFILED } from './folders';
import { ideaDir, ideaFile, ideasDir, isMissing, dataDir } from './paths';
import { progressOf } from './progress';
import { writeIndex } from './index-file';
import { CONTEXT_FIELDS, CONTEXT_MAX, EMPTY_CONTEXT, IDEA_FILE_VERSION, type Idea, type IdeaContext } from './types';

/** 사용자에게 그대로 보여 줘도 되는 오류 (한국어 한 줄). 나머지 오류는 화면에서 일반 안내로 바꾼다. */
export class StorageError extends Error {}

function cleanTitle(title: string) {
  const t = title.trim();
  if (!t) throw new StorageError('제목을 적어 주세요.');
  return t;
}

function cleanFolder(folder: string) {
  const f = folder.trim().replace(/\s+/g, ' ');
  if (f.length > FOLDER_MAX) throw new StorageError('폴더 이름은 30자까지예요.');
  return f === UNFILED ? '' : f;
}

async function writeIdea(idea: Idea) {
  const { memo, ...front } = idea;
  await fs.mkdir(ideaDir(idea.id), { recursive: true });
  await fs.writeFile(ideaFile(idea.id), matter.stringify(memo, { ...front, version: IDEA_FILE_VERSION }));
}

/** 머리말 context → 네 칸 문자열. 없거나 깨진 칸은 '' (1판 호환) */
function readContext(raw: unknown): IdeaContext {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    CONTEXT_FIELDS.map((f) => [f.key, typeof obj[f.key] === 'string' ? (obj[f.key] as string) : '']),
  ) as IdeaContext;
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
  const folder = typeof data.folder === 'string' ? data.folder : '';
  return { id, title, memo: content.replace(/^\n/, '').trimEnd(), createdAt, updatedAt, context: readContext(data.context), folder };
}

export async function listIdeas(): Promise<{ ideas: Idea[]; unreadable: number }> {
  let dirs: string[];
  try {
    dirs = (await fs.readdir(ideasDir(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    if (isMissing(e)) return { ideas: [], unreadable: 0 };
    throw e;
  }

  // 손으로 만든 폴더(이름이 id 형식 밖)는 읽지 않고 개수만 센다 — 다른 함수들이 id 검사에서 throw하기 때문
  const ids = dirs.filter(isValidId);
  const results = await Promise.allSettled(ids.map(readIdea));
  const ideas = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ideas, unreadable: dirs.length - ideas.length };
}

/** 목록.md 다시 쓰기. 목록을 못 읽어도 저장이 실패한 것처럼 보이면 안 되므로 감싼다 */
const refreshIndex = () =>
  listIdeas()
    .then(({ ideas }) => writeIndex(ideas))
    .catch((e) => console.error('[hatch] 목록.md', e));

export async function getIdea(id: string): Promise<Idea | null> {
  assertValidId(id);
  try {
    return await readIdea(id);
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

export async function createIdea(input: { title: string; memo: string; folder?: string }): Promise<Idea> {
  const now = new Date();
  const at = now.toISOString();
  const idea: Idea = {
    id: newId(now),
    title: cleanTitle(input.title),
    memo: input.memo.trim(),
    createdAt: at,
    updatedAt: at,
    context: EMPTY_CONTEXT,
    folder: cleanFolder(input.folder ?? ''),
  };
  await writeIdea(idea);
  await refreshIndex();
  return idea;
}

export async function updateIdea(id: string, patch: { title?: string; memo?: string; folder?: string }): Promise<Idea> {
  const current = await getIdea(id);
  if (!current) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const next: Idea = {
    ...current,
    title: patch.title === undefined ? current.title : cleanTitle(patch.title),
    memo: patch.memo === undefined ? current.memo : patch.memo.trim(),
    folder: patch.folder === undefined ? current.folder : cleanFolder(patch.folder),
    updatedAt: new Date().toISOString(),
  };
  await writeIdea(next);
  await refreshIndex();
  return next;
}

export async function updateIdeaContext(id: string, ctx: IdeaContext): Promise<Idea> {
  const current = await getIdea(id);
  if (!current) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const context = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, (ctx[f.key] ?? '').trim()])) as IdeaContext;
  if (Object.values(context).some((v) => v.length > CONTEXT_MAX)) throw new StorageError('맥락 칸은 1,000자까지예요.');
  const next: Idea = { ...current, context, updatedAt: new Date().toISOString() };
  await writeIdea(next);
  return next;
}

/** 지우지 않고 `.trash/`로 옮긴다. 같은 이름이 있으면 `-1`, `-2`… 이미 없으면 아무것도 안 한다. */
export async function trashIdea(id: string): Promise<void> {
  assertValidId(id);
  const exists = await fs.stat(ideaDir(id)).then(() => true, () => false);
  if (!exists) return;

  const trash = path.join(dataDir(), '.trash');
  await fs.mkdir(trash, { recursive: true });

  let target = path.join(trash, id);
  for (let n = 1; await fs.stat(target).then(() => true, () => false); n++) {
    target = path.join(trash, `${id}-${n}`);
  }
  await fs.rename(ideaDir(id), target);
  await refreshIndex();
}

/** 목록 화면용: 아이디어 + 진행 배지 문구 + 만든 문서 수 */
export async function listIdeasWithProgress() {
  const { ideas, unreadable } = await listIdeas();
  const items = await Promise.all(
    ideas.map(async (idea) => {
      const docs = await getDocs(idea.id);
      return { idea, progress: progressOf(docs), done: docs.filter((d) => d.content !== null).length, total: docs.length };
    }),
  );
  return { items, unreadable };
}
