import { z } from 'zod';

import { PRD_PROMPT } from '@/lib/prompts/chain/prd';

import type { ChainStep } from '../types';

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n');

// 받침 있으면 '으로서', 없거나 ㄹ 받침이면 '로서' (직장인으로서 · 디자이너로서)
const roseo = (who: string) => {
  const code = who.trim().slice(-1).charCodeAt(0) - 0xac00;
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0;
  return jong !== 0 && jong !== 8 ? '으로서' : '로서';
};

export const prdSchema = z.object({
  background: z.string().min(1),
  goals: z.array(z.string()).min(1),
  nonGoals: z.array(z.string()),
  userStories: z.array(z.object({ as: z.string().min(1), want: z.string().min(1), soThat: z.string().min(1) })).min(1),
  requirements: z.array(z.object({ content: z.string().min(1), priority: z.enum(['P0', 'P1', 'P2']) })).min(1),
  metrics: z.array(z.string()).min(1),
  releaseScope: z.string().min(1),
  openQuestions: z.array(z.string()),
});

export type PrdOutput = z.infer<typeof prdSchema>;

export const prdStep: ChainStep<PrdOutput> = {
  key: 'prd',
  extra: ['plan'],
  schema: prdSchema,
  prompt: PRD_PROMPT,
  render: (o) =>
    [
      `## 배경\n${o.background}`,
      `## 목표\n${list(o.goals)}`,
      `## 비목표\n${list(o.nonGoals) || '- 없음'}`,
      `## 사용자 스토리\n${o.userStories.map((s) => `- **${s.as}**${roseo(s.as)} ${s.want} — ${s.soThat}`).join('\n')}`,
      `## 요구사항\n${o.requirements.map((r, i) => `- **R${i + 1}** \`${r.priority}\` ${r.content}`).join('\n')}`,
      `## 지표\n${list(o.metrics)}`,
      `## 출시 범위\n${o.releaseScope}`,
      `## 확인 필요\n${list(o.openQuestions) || '- 없음'}`,
    ].join('\n\n'),
};
