import { z } from 'zod';

import { PLAN_PROMPT } from '@/lib/prompts/chain/plan';

import type { ChainStep } from '../types';

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n');

export const planSchema = z.object({
  summary: z.string().min(1),
  problem: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  value: z.string().min(1),
  features: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })).min(1),
  successMetrics: z.array(z.string()).min(1),
  risks: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export type PlanOutput = z.infer<typeof planSchema>;

export const planStep: ChainStep<PlanOutput> = {
  key: 'plan',
  schema: planSchema,
  prompt: PLAN_PROMPT,
  render: (o) =>
    [
      `## 한 줄 요약\n${o.summary}`,
      `## 문제\n${o.problem}`,
      `## 대상 사용자\n${list(o.targetUsers)}`,
      `## 핵심 가치\n${o.value}`,
      `## 주요 기능\n${o.features.map((f) => `- **${f.name}** — ${f.description}`).join('\n')}`,
      `## 성공 지표\n${list(o.successMetrics)}`,
      `## 위험\n${list(o.risks) || '- 없음'}`,
      `## 확인 필요\n${list(o.openQuestions) || '- 없음'}`,
    ].join('\n\n'),
};
