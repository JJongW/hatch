import { z } from 'zod';

import { MAX_LONG, MAX_SHORT, QUESTIONS, type Participant, type Question } from './questions';

export type SurveyAnswers = Record<string, string | string[] | number | Record<string, string>>;
export type ParseResult =
  | { ok: true; participant: Participant; answers: SurveyAnswers }
  | { ok: false; errors: Record<string, string> };

const REQUIRED = '답해 주세요.';
const WRONG = '보기에서 골라 주세요.';

/** 문항 하나의 검사. 빈 값(공백 글, 빈 배열)은 여기 오기 전에 undefined로 바꾼다 */
function fieldSchema(q: Question): z.ZodType {
  switch (q.type) {
    case 'single':
      return z.enum(q.options as [string, ...string[]], { error: WRONG });
    case 'multi':
      return z.array(z.enum(q.options as [string, ...string[]]), { error: WRONG }).refine((a) => new Set(a).size === a.length, WRONG);
    case 'scale':
      return z.number({ error: WRONG }).int(WRONG).min(q.min, WRONG).max(q.max, WRONG);
    case 'grid': {
      const row = z.enum(q.options as [string, ...string[]], { error: WRONG });
      return z.object(Object.fromEntries(q.rows.map((_, i) => [String(i), row]))).strip();
    }
    case 'short':
      return z.string().max(MAX_SHORT, `${MAX_SHORT}자 안으로 적어 주세요.`);
    case 'long':
      return z.string().max(MAX_LONG, `${MAX_LONG}자 안으로 적어 주세요.`);
  }
}

function emptyToUndefined(v: unknown) {
  if (typeof v === 'string') return v.trim() || undefined;
  if (Array.isArray(v)) return v.length ? v : undefined;
  return v ?? undefined;
}

/** 화면이 보낸 답(JSON)을 문항 정의로 검사한다. 모르는 칸은 버린다 */
export function parseResponse(raw: unknown): ParseResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: { form: '답을 읽지 못했어요.' } };
  const input = raw as Record<string, unknown>;
  const answers: SurveyAnswers = {};
  const errors: Record<string, string> = {};

  for (const q of QUESTIONS) {
    const value = emptyToUndefined(input[q.id]);
    if (value === undefined) {
      if (q.required) errors[q.id] = REQUIRED;
      continue;
    }
    const r = fieldSchema(q).safeParse(value);
    if (r.success) answers[q.id] = r.data as SurveyAnswers[string];
    else errors[q.id] = q.type === 'grid' ? '모든 과제에 답해 주세요.' : (r.error.issues[0]?.message ?? WRONG);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const { participant, ...rest } = answers;
  return { ok: true, participant: participant as Participant, answers: rest };
}
