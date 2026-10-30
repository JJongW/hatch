import { z } from 'zod';

import { DESIGN_PROMPT_PROMPT } from '@/lib/prompts/chain/design-prompt';

import type { ChainStep } from '../types';

import { fenced } from './fence';

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n');

export const designPromptSchema = z.object({
  prompt: z.string().min(1),
  screens: z.array(z.string()).min(1),
  tone: z.string().min(1),
  references: z.array(z.string()),
});

export type DesignPromptOutput = z.infer<typeof designPromptSchema>;

export const designPromptStep: ChainStep<DesignPromptOutput> = {
  key: 'design-prompt',
  // 화면 목록 · 동작은 기능명세, 필드 · 예시값은 데이터 구성(from)에서
  extra: ['spec'],
  schema: designPromptSchema,
  prompt: DESIGN_PROMPT_PROMPT,
  render: (o) =>
    [
      `## 프롬프트\n${fenced(o.prompt)}`,
      `## 화면 목록\n${list(o.screens)}`,
      `## 톤\n${o.tone}`,
      `## 참고 패턴\n${list(o.references) || '- 없음'}`,
    ].join('\n\n'),
};
