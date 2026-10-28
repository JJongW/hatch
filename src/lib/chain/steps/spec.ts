import { z } from 'zod';

import { SPEC_PROMPT } from '@/lib/prompts/chain/spec';

import type { ChainStep } from '../types';

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n');

export const specSchema = z.object({
  screens: z
    .array(
      z.object({
        name: z.string().min(1),
        purpose: z.string().min(1),
        elements: z.array(z.string()).min(1),
        actions: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  functions: z
    .array(
      z.object({
        name: z.string().min(1),
        input: z.string().min(1),
        process: z.string().min(1),
        output: z.string().min(1),
        exceptions: z.array(z.string()),
      }),
    )
    .min(1),
  dataItems: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })),
  openQuestions: z.array(z.string()),
});

export type SpecOutput = z.infer<typeof specSchema>;

export const specStep: ChainStep<SpecOutput> = {
  key: 'spec',
  schema: specSchema,
  prompt: SPEC_PROMPT,
  render: (o) =>
    [
      `## 화면\n${o.screens
        .map((s) => `### ${s.name}\n${s.purpose}\n\n**구성 요소**\n${list(s.elements)}\n\n**동작**\n${list(s.actions)}`)
        .join('\n\n')}`,
      `## 기능\n${o.functions
        .map(
          (f, i) =>
            `### F${i + 1}. ${f.name}\n- **입력** ${f.input}\n- **처리** ${f.process}\n- **출력** ${f.output}\n\n**예외**\n${list(f.exceptions) || '- 없음'}`,
        )
        .join('\n\n')}`,
      `## 데이터 항목\n${o.dataItems.map((d) => `- **${d.name}** — ${d.description}`).join('\n') || '- 없음'}`,
      `## 확인 필요\n${list(o.openQuestions) || '- 없음'}`,
    ].join('\n\n'),
};
