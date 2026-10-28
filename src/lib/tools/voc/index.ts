import { z } from 'zod';

import { VOC_HEADING, VOC_PROMPT } from '@/lib/prompts/tools/voc';

import type { ToolDef } from '../types';

import { computeVoc, MAX_VOC_LINES, renderVoc, type VocInput, type VocOutput, type VocResult } from './compute';

// 폼 문자열 → 빈 줄을 뺀 VOC 줄 목록
export const vocInputSchema = z
  .object({
    voc: z
      .string({ error: 'VOC를 붙여넣어 주세요.' })
      .max(30_000, '입력이 너무 길어요 (최대 30,000자).')
      .transform((s) => s.split('\n').map((l) => l.trim()).filter(Boolean))
      .pipe(
        z
          .array(z.string())
          .min(1, 'VOC를 한 줄 이상 붙여넣어 주세요.')
          .max(MAX_VOC_LINES, `입력이 너무 길어요 (최대 ${MAX_VOC_LINES}줄).`),
      ),
  })
  .transform(({ voc }) => ({ lines: voc })) as unknown as z.ZodType<VocInput>;

export const vocOutputSchema = z.object({
  topics: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })).min(1).max(8),
  items: z.array(z.object({ line: z.number().int(), topic: z.string(), severity: z.number() })),
}) satisfies z.ZodType<VocOutput>;

export const vocTool: ToolDef<VocInput, VocOutput, VocResult> = {
  key: 'voc',
  label: 'VOC 우선순위',
  description: 'VOC를 한 줄에 하나씩 붙여넣으면 주제로 묶고, 건수 × 평균 심각도로 우선순위를 매겨요.',
  accepts: ['plan', 'prd'],
  sourceOptional: true,
  runningLabel: 'VOC를 묶는 중이에요 (1~2분)',
  inputSchema: vocInputSchema,
  outputSchema: vocOutputSchema,
  prompt: VOC_PROMPT,
  promptInput: ({ lines }) => `${VOC_HEADING}\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`,
  compute: (out, input) => computeVoc(out, input),
  render: renderVoc,
};
