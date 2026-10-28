import { z } from 'zod';

import { ROADMAP_PROMPT } from '@/lib/prompts/chain/roadmap';

import type { ChainStep } from '../types';

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n') || '- 없음';

export const roadmapSchema = z.object({
  overview: z.string().min(1),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        goal: z.string().min(1),
        scope: z.array(z.string()).min(1),
        doneWhen: z.array(z.string()).min(1),
      }),
    )
    .min(2),
  outOfScope: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export type RoadmapOutput = z.infer<typeof roadmapSchema>;

export const roadmapStep: ChainStep<RoadmapOutput> = {
  key: 'roadmap',
  schema: roadmapSchema,
  prompt: ROADMAP_PROMPT,
  render: (o) =>
    [
      `## 개요\n${o.overview}`,
      `## 마일스톤\n\n${o.milestones
        .map(
          (m, i) =>
            `### ${i + 1}. ${m.name}${i === 0 ? ' (MVP)' : ''}\n**목표** ${m.goal}\n\n**범위**\n${list(m.scope)}\n\n**완료 기준**\n${list(m.doneWhen)}`,
        )
        .join('\n\n')}`,
      `## 이번에 하지 않는 것\n${list(o.outOfScope)}`,
      `## 확인 필요\n${list(o.openQuestions)}`,
    ].join('\n\n'),
};
