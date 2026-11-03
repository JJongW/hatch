import { z } from 'zod';

import { QUESTION_MAX, QUESTION_ROLES, type QuestionItem, type QuestionRole } from '../storage/types';

/** claude에 주는 출력 스키마 (값을 enum으로 안내). 검사는 validateQuestions가 항목마다 따로 한다 */
export const questionsSchema = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(['customer', 'owner', 'decision']),
      role: z.enum(['', ...QUESTION_ROLES]),
      question: z.string(),
    }),
  ),
});

const isRole = (v: unknown): v is QuestionRole => (QUESTION_ROLES as readonly unknown[]).includes(v);

/** 항목마다 고치거나 버린다. 입력 라벨이 하나라도 빠지면 null (spec §3). 결과는 입력 라벨 순서 */
export function validateQuestions(labels: string[], raw: unknown): QuestionItem[] | null {
  const list: unknown = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return null;
  const want = new Set(labels);
  const byLabel = new Map<string, QuestionItem>();
  for (const it of list) {
    if (typeof it !== 'object' || it === null) continue;
    const { label, kind, role, question } = it as Record<string, unknown>;
    if (typeof label !== 'string' || !want.has(label) || byLabel.has(label) || typeof question !== 'string') continue;
    const q = question.replace(/\s+/g, ' ').trim();
    if (!q || q.length > QUESTION_MAX) continue;
    if (kind === 'customer' || kind === 'decision') byLabel.set(label, { label, kind, role: '', question: q });
    else if (kind === 'owner' && (role === '' || isRole(role))) {
      byLabel.set(label, { label, kind, role: role === '' ? '기획' : role, question: q });
    }
  }
  if (labels.some((l) => !byLabel.has(l))) return null;
  return labels.map((l) => byLabel.get(l)!);
}
