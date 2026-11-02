import { z } from 'zod';

import {
  NEGOTIATION_ANSWER_HEADING,
  NEGOTIATION_HISTORY_HEADING,
  NEGOTIATION_PERSONA_HEADING,
  NEGOTIATION_PROMPT,
} from '@/lib/prompts/tools/negotiation';

import type { ToolDef } from '../types';

import {
  computeNegotiation,
  CRITERIA,
  MAX_ANSWER_CHARS,
  renderNegotiation,
  type NegotiationInput,
  type NegotiationOutput,
  type NegotiationResult,
} from './compute';

// 라운드마다 칸이 달라서 한 스키마에 선택 칸으로 둔다 (1라운드 persona · 다음 라운드 scores …). 나누는 건 compute
export const negotiationOutputSchema = z.object({
  persona: z.object({ role: z.string().min(1), goal: z.string().min(1), pressure: z.string().min(1) }).optional(),
  scores: z.array(z.object({ criterion: z.enum(CRITERIA), score: z.number(), reason: z.string().min(1) })).optional(),
  feedback: z.string().optional(),
  reaction: z.string().optional(),
  request: z.string().min(1),
}) satisfies z.ZodType<NegotiationOutput>;

export const negotiationInputSchema = z
  .object({
    answer: z
      .string({ error: '내 답을 확인해 주세요.' })
      .trim()
      .max(MAX_ANSWER_CHARS, { error: `입력이 너무 길어요 (최대 ${MAX_ANSWER_CHARS.toLocaleString('ko-KR')}자).` })
      .default(''),
  })
  .strip();

export const negotiationTool: ToolDef<NegotiationInput, NegotiationOutput, NegotiationResult> = {
  key: 'negotiation',
  label: '이해관계자 협상',
  description: '문서와 부딪히는 요청을 하는 이해관계자와 라운드마다 협상을 연습해요. 상대 반응과 피드백을 보고 답을 다듬어요. 점수는 참고로만 보여 줘요.',
  accepts: ['prd', 'plan'],
  continueLabel: '내 답 보내기',
  runningLabel: '상대가 답을 읽는 중이에요 (1~2분)',
  runningSteps: ['상대 입장 읽기', '쟁점 나누기', '상대 답 쓰기', '합의 가능한 선 정리'],
  inputSchema: negotiationInputSchema,
  validate: (input, prev) => {
    if (!prev && input.answer) return "1라운드는 내 답 없이 시작해요. 상대 요청을 받은 뒤 '내 답 보내기'를 눌러 주세요.";
    if (prev && !input.answer) return '내 답을 적어 주세요.';
  },
  outputSchema: negotiationOutputSchema,
  prompt: NEGOTIATION_PROMPT,
  promptInput: (input, prev) => {
    if (!prev) return '';
    const p = prev.persona;
    const history = prev.rounds
      .map(
        (t) =>
          `[${t.round}라운드]` +
          (t.answer ? `\n내 답: ${t.answer}\n상대 반응: ${t.reaction ?? '없음'}` : '') +
          `\n상대 요청: ${t.request}`,
      )
      .join('\n\n');
    return [
      `${NEGOTIATION_PERSONA_HEADING}\n` + (p ? `역할: ${p.role}\n목표: ${p.goal}\n압박: ${p.pressure}` : '[확인 필요: 상대 정보]'),
      `${NEGOTIATION_HISTORY_HEADING}\n${history}`,
      `${NEGOTIATION_ANSWER_HEADING} (${prev.rounds.length + 1}라운드)\n${input.answer}`,
    ].join('\n\n');
  },
  compute: computeNegotiation,
  render: renderNegotiation,
};
