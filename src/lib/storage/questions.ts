import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { QUESTION_FILE_VERSION, QUESTION_MAX, QUESTION_ROLES, type QuestionItem, type QuestionSet } from './types';

const file = (id: string) => path.join(ideaDir(id), 'questions.md');
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v); // 손으로 고친 날짜는 YAML Date

function isQuestionItem(v: unknown): v is QuestionItem {
  if (typeof v !== 'object' || v === null) return false;
  const q = v as Record<string, unknown>;
  if (typeof q.label !== 'string' || typeof q.question !== 'string') return false;
  if (!q.question.trim() || q.question.length > QUESTION_MAX) return false;
  if (q.kind === 'customer' || q.kind === 'decision') return q.role === '';
  return q.kind === 'owner' && (QUESTION_ROLES as readonly unknown[]).includes(q.role);
}

/** 파일이 없거나 깨졌으면 null(아직 안 만듦), 깨진 항목은 건너뛴다 */
export async function getQuestions(id: string): Promise<QuestionSet | null> {
  assertValidId(id);
  let raw: string;
  try {
    raw = await fs.readFile(file(id), 'utf8');
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
  try {
    const d = matter(raw).data;
    const createdAt = iso(d.createdAt);
    if (typeof createdAt !== 'string' || !Array.isArray(d.labels) || !Array.isArray(d.items)) return null;
    return {
      createdAt,
      labels: d.labels.filter((l: unknown): l is string => typeof l === 'string'),
      items: d.items.filter(isQuestionItem),
    };
  } catch {
    return null;
  }
}

/** 통째로 바꾼다. 이전 판은 .history/questions-<시각>.md */
export async function saveQuestions(id: string, set: Pick<QuestionSet, 'labels' | 'items'>): Promise<QuestionSet> {
  if (!(await getIdea(id))) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const saved: QuestionSet = { createdAt: new Date().toISOString(), labels: set.labels, items: set.items };
  await keepHistory(id, file(id), 'questions');
  await fs.writeFile(file(id), matter.stringify('', { version: QUESTION_FILE_VERSION, ...saved }));
  return saved;
}
