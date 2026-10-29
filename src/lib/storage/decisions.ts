import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { DECISION_FILE_VERSION, type Decision, type DecisionInput } from './types';

const LIMIT = { question: 200, answer: 500, reason: 500 };
const file = (id: string) => path.join(ideaDir(id), 'decisions.md');
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v); // 손으로 고친 날짜는 YAML Date

function isDecision(v: unknown): v is Decision {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    ['id', 'question', 'answer', 'reason', 'decidedAt'].every((k) => typeof d[k] === 'string') &&
    (d.status === 'decided' || d.status === 'deferred') &&
    (d.from === 'plan' || d.from === 'manual')
  );
}

/** 파일이 없거나 깨졌으면 빈 목록, 깨진 항목은 건너뛴다 */
export async function listDecisions(id: string): Promise<Decision[]> {
  assertValidId(id);
  let raw: string;
  try {
    raw = await fs.readFile(file(id), 'utf8');
  } catch (e) {
    if (isMissing(e)) return [];
    throw e;
  }
  try {
    const items: unknown = matter(raw).data.items;
    if (!Array.isArray(items)) return [];
    return items.map((it) => (typeof it === 'object' && it ? { ...it, decidedAt: iso((it as Decision).decidedAt) } : it)).filter(isDecision);
  } catch {
    return [];
  }
}

function clean(input: DecisionInput): DecisionInput {
  if (input.status !== 'decided' && input.status !== 'deferred') throw new StorageError('정함 · 보류 중 하나를 골라 주세요.');
  const question = input.question.trim();
  const answer = input.status === 'decided' ? input.answer.trim() : '';
  const reason = input.reason.trim();
  if (!question) throw new StorageError('정할 것을 적어 주세요.');
  if (input.status === 'decided' && !answer) throw new StorageError('고른 답을 적어 주세요.');
  if (!reason) throw new StorageError('이유를 적어 주세요.');
  if (question.length > LIMIT.question || answer.length > LIMIT.answer || reason.length > LIMIT.reason) {
    throw new StorageError('정할 것은 200자, 답 · 이유는 500자까지예요.');
  }
  return { question, status: input.status, answer, reason, from: input.from === 'plan' ? 'plan' : 'manual' };
}

async function write(id: string, items: Decision[]) {
  await keepHistory(id, file(id), 'decisions');
  await fs.writeFile(file(id), matter.stringify('', { version: DECISION_FILE_VERSION, items }));
}

/** decisionId가 있으면 그 결정을 고친다 (출처 · id는 그대로) */
export async function saveDecision(id: string, input: DecisionInput, decisionId?: string): Promise<Decision> {
  if (!(await getIdea(id))) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const c = clean(input);
  const items = await listDecisions(id);
  const decidedAt = new Date().toISOString();
  let saved: Decision;
  if (decisionId) {
    const i = items.findIndex((d) => d.id === decisionId);
    if (i < 0) throw new StorageError('결정을 찾을 수 없어요. 새로고침해 주세요.');
    saved = { ...items[i], ...c, from: items[i].from, decidedAt };
    items[i] = saved;
  } else {
    let newId: string;
    do {
      newId = crypto.randomBytes(2).toString('hex');
    } while (items.some((d) => d.id === newId));
    saved = { id: newId, ...c, decidedAt };
    items.push(saved);
  }
  await write(id, items);
  return saved;
}

/** 목록에서 뺀다. 이전 판은 .history에 남는다 */
export async function removeDecision(id: string, decisionId: string): Promise<void> {
  const items = await listDecisions(id);
  const next = items.filter((d) => d.id !== decisionId);
  if (next.length === items.length) return;
  await write(id, next);
}
