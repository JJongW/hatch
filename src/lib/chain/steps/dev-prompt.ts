import { z } from 'zod';

import { DEV_PROMPT_PROMPT } from '@/lib/prompts/chain/dev-prompt';

import type { ChainStep } from '../types';

export const devPromptSchema = z.object({
  prompt: z.string().min(1),
  assumptions: z.array(z.string()).min(1),
  steps: z.array(z.string()).min(1),
});

export type DevPromptOutput = z.infer<typeof devPromptSchema>;

export const devPromptStep: ChainStep<DevPromptOutput> = {
  key: 'dev-prompt',
  schema: devPromptSchema,
  prompt: DEV_PROMPT_PROMPT,
  // 본문에 ``` 가 있어도 안 깨지게 ~~~ 펜스로 감싼다
  render: (o) =>
    [
      `## 프롬프트\n~~~text\n${o.prompt}\n~~~`,
      `## 기술 가정\n${o.assumptions.map((s) => `- ${s}`).join('\n')}`,
      `## 작업 순서\n${o.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    ].join('\n\n'),
};
