import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { PROJECT_BLOCK } from '@/lib/prompts/context';

import { listDecisions } from './decisions';
import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { CONTEXT_FIELDS, DOC_FILE_VERSION, DOC_STEPS, type Decision, type Doc, type DocKey, type Idea, type IdeaContext } from './types';

const RUNNING_TTL_MS = 10 * 60_000;

const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');

/** 맥락 · 정한 것 · 보류한 것 블록. 모두 비면 '' — 그래야 기존 아이디어의 입력 · 해시가 그대로다 */
export function projectBlock(context: IdeaContext, decisions: Decision[] = []): string {
  const B = PROJECT_BLOCK;
  const parts: [string, string[]][] = [
    [B.context, CONTEXT_FIELDS.filter((f) => context[f.key].trim()).map((f) => `- ${f.label}: ${oneLine(context[f.key])}`)],
    [B.decided, decisions.filter((d) => d.status === 'decided').map((d) => `- ${oneLine(d.question)} → ${oneLine(d.answer)} (${B.reason}: ${oneLine(d.reason)})`)],
    [B.deferred, decisions.filter((d) => d.status === 'deferred').map((d) => `- ${oneLine(d.question)} (${B.deferReason}: ${oneLine(d.reason)})`)],
  ];
  return parts.filter(([, lines]) => lines.length).map(([h, lines]) => `${h}\n${lines.join('\n')}`).join('\n\n');
}

export const ideaSource = (idea: Pick<Idea, 'title' | 'memo' | 'context'>, decisions: Decision[] = []) =>
  [`# ${idea.title}\n\n${idea.memo}`.trim(), projectBlock(idea.context, decisions)].filter(Boolean).join('\n\n');
export const hashOf = (text: string) => crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 12);

const stepOf = (key: DocKey) => DOC_STEPS.find((s) => s.key === key)!;
// 생성 문서는 <id>/docs/. 예전 자리(<id>/<file>)는 읽기만 대체하고, 쓸 때 keepHistory가 .history/로 옮긴다 (spec 구조화 §4)
const docPath = (id: string, key: DocKey) => path.join(ideaDir(id), 'docs', stepOf(key).file);
const oldDocPath = (id: string, key: DocKey) => path.join(ideaDir(id), stepOf(key).file);

/** 본문을 stringify에 넣으면 `---`로 시작할 때 머리말로 다시 읽히므로, 머리말만 만들고 본문은 이어 붙인다 */
const withFront = (data: Record<string, unknown>, body: string) => matter.stringify('', data) + '\n' + body.trim() + '\n';

async function readRaw(id: string, key: DocKey) {
  for (const p of [docPath(id, key), oldDocPath(id, key)]) {
    try {
      return await fs.readFile(p, 'utf8');
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
  }
  return null;
}

/** 쓰기 전: 두 자리의 지금 판을 .history/로 옮기고 docs/ 폴더를 만든다 */
async function keepOld(id: string, key: DocKey) {
  await keepHistory(id, docPath(id, key), key);
  await keepHistory(id, oldDocPath(id, key), key);
  await fs.mkdir(path.dirname(docPath(id, key)), { recursive: true });
}

export async function getDocs(id: string): Promise<Doc[]> {
  assertValidId(id);
  const [idea, decisions] = await Promise.all([getIdea(id), listDecisions(id)]);
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
    from === 'idea' ? (idea ? ideaSource(idea, decisions) : null) : (parsed.find((p) => p.step.key === from)?.body ?? null);

  return parsed.map(({ step, body, sourceHash }) => {
    const source = bodyOf(step.from);
    const stale = body !== null && sourceHash !== undefined && source !== null && sourceHash !== hashOf(source);
    return { ...step, content: body, stale };
  });
}

export async function saveDoc(id: string, key: DocKey, body: string, meta: { sourceHash: string }) {
  assertValidId(id);
  await keepOld(id, key);
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
  await keepOld(id, key);
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
