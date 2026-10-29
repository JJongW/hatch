import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { PROJECT_BLOCK } from '@/lib/prompts/context';

import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { CONTEXT_FIELDS, DOC_FILE_VERSION, DOC_STEPS, type Doc, type DocKey, type Idea, type IdeaContext } from './types';

const RUNNING_TTL_MS = 10 * 60_000;

const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');

/** 맥락 블록. 채운 칸이 없으면 '' — 그래야 맥락 없는 아이디어의 입력 · 해시가 그대로다 */
export function projectBlock(context: IdeaContext): string {
  const lines = CONTEXT_FIELDS.filter((f) => context[f.key].trim()).map((f) => `- ${f.label}: ${oneLine(context[f.key])}`);
  return lines.length ? `${PROJECT_BLOCK.context}\n${lines.join('\n')}` : '';
}

export const ideaSource = (idea: Pick<Idea, 'title' | 'memo' | 'context'>) =>
  [`# ${idea.title}\n\n${idea.memo}`.trim(), projectBlock(idea.context)].filter(Boolean).join('\n\n');
export const hashOf = (text: string) => crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 12);

const stepOf = (key: DocKey) => DOC_STEPS.find((s) => s.key === key)!;
const docPath = (id: string, key: DocKey) => path.join(ideaDir(id), stepOf(key).file);

/** 본문을 stringify에 넣으면 `---`로 시작할 때 머리말로 다시 읽히므로, 머리말만 만들고 본문은 이어 붙인다 */
const withFront = (data: Record<string, unknown>, body: string) => matter.stringify('', data) + '\n' + body.trim() + '\n';

async function readRaw(id: string, key: DocKey) {
  return fs.readFile(docPath(id, key), 'utf8').catch((e) => {
    if (isMissing(e)) return null;
    throw e;
  });
}

export async function getDocs(id: string): Promise<Doc[]> {
  assertValidId(id);
  const idea = await getIdea(id);
  const parsed = await Promise.all(
    DOC_STEPS.map(async (step) => {
      const raw = await readRaw(id, step.key);
      if (raw === null) return { step, body: null, sourceHash: undefined };
      try {
        const { data, content } = matter(raw);
        return { step, body: content.trim(), sourceHash: typeof data.sourceHash === 'string' ? data.sourceHash : undefined };
      } catch {
        // 손으로 쓴 머리말이 깨졌다: 목록 화면 전체가 죽지 않게 통째로 본문 취급
        return { step, body: raw.trim(), sourceHash: undefined };
      }
    }),
  );
  const bodyOf = (from: DocKey | 'idea') =>
    from === 'idea' ? (idea ? ideaSource(idea) : null) : (parsed.find((p) => p.step.key === from)?.body ?? null);

  return parsed.map(({ step, body, sourceHash }) => {
    const source = bodyOf(step.from);
    const stale = body !== null && sourceHash !== undefined && source !== null && sourceHash !== hashOf(source);
    return { ...step, content: body, stale };
  });
}

export async function saveDoc(id: string, key: DocKey, body: string, meta: { sourceHash: string }) {
  assertValidId(id);
  await keepHistory(id, docPath(id, key), key);
  const front = { generatedAt: new Date().toISOString(), sourceHash: meta.sourceHash, version: DOC_FILE_VERSION };
  await fs.writeFile(docPath(id, key), withFront(front, body));
}

export async function updateDocBody(id: string, key: DocKey, body: string) {
  assertValidId(id);
  const raw = await readRaw(id, key);
  if (raw === null) throw new StorageError('문서를 찾을 수 없어요. 먼저 만들어 주세요.');
  let data: Record<string, unknown> = {};
  try {
    data = matter(raw).data;
  } catch {
    // 깨진 머리말은 버리고 본문만 새로 쓴다 (이전 판은 .history에 남음)
  }
  await keepHistory(id, docPath(id, key), key);
  await fs.writeFile(docPath(id, key), withFront(data, body));
}

const runningFile = (id: string) => path.join(ideaDir(id), '.running.json');

export async function getRunning(id: string): Promise<{ key: DocKey; startedAt: string } | null> {
  assertValidId(id);
  const raw = await fs.readFile(runningFile(id), 'utf8').catch(() => null);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    if (!DOC_STEPS.some((s) => s.key === r?.key)) return null;
    const started = Date.parse(r.startedAt);
    if (!Number.isFinite(started) || Date.now() - started > RUNNING_TTL_MS) return null;
    return { key: r.key, startedAt: r.startedAt };
  } catch {
    return null;
  }
}

export async function markRunning(id: string, key: DocKey) {
  assertValidId(id);
  await fs.writeFile(runningFile(id), JSON.stringify({ key, startedAt: new Date().toISOString() }));
}

/** 표시 파일 하나를 치운다 (생성 상태 표시일 뿐 사용자 데이터가 아님) */
export async function clearRunning(id: string) {
  assertValidId(id);
  await fs.rm(runningFile(id), { force: true });
}
