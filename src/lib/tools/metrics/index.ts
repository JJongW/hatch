import { z } from 'zod';

import { METRICS_INPUT_HEADING, METRICS_PROMPT } from '@/lib/prompts/tools/metrics';

import type { ToolDef } from '../types';

import { computeMetrics, conditionLines, renderMetrics, type MetricsInput, type MetricsOutput, type MetricsResult } from './compute';

const metric = z.object({ name: z.string().min(1), definition: z.string().min(1), why: z.string().min(1) });

export const metricsOutputSchema = z.object({
  coreMetric: metric,
  secondaryMetrics: z.array(metric).min(2),
  guardrails: z.array(metric).min(1),
  experiments: z
    .array(z.object({ hypothesis: z.string().min(1), variants: z.array(z.string().min(1)).min(2), primaryMetric: z.string().min(1) }))
    .min(1),
}) satisfies z.ZodType<MetricsOutput>;

// 폼 문자열 → 숫자 | null (빈 칸). 쉼표 · % 허용
const optionalNumber = (label: string, ok: (n: number) => boolean, rule: string) =>
  z
    .string()
    .optional()
    .transform((s, ctx) => {
      const t = (s ?? '').replace(/[,%\s]/g, '');
      if (!t) return null;
      const n = Number(t);
      if (!Number.isFinite(n) || !ok(n)) {
        ctx.addIssue({ code: 'custom', message: `${label} ${rule}` });
        return z.NEVER;
      }
      return n;
    });

export const metricsInputSchema = z
  .object({
    baselineRate: optionalNumber('기준 전환율은', (n) => n > 0 && n < 100, '0보다 크고 100보다 작은 숫자(%)로 적어 주세요.'),
    minEffect: optionalNumber('최소 감지 효과는', (n) => n > 0, '0보다 큰 숫자(%)로 적어 주세요.'),
    dailyTraffic: optionalNumber('하루 실험 대상 수는', (n) => Number.isInteger(n) && n >= 1, '1 이상의 정수로 적어 주세요.'),
  })
  .refine((i) => i.baselineRate === null || i.minEffect === null || i.baselineRate * (1 + i.minEffect / 100) < 100, {
    message: '기준 전환율에 효과를 더하면 100%를 넘어요. 최소 감지 효과를 줄여 주세요.',
  }) satisfies z.ZodType<MetricsInput, Partial<Record<keyof MetricsInput, string>>>;

export const metricsTool: ToolDef<MetricsInput, MetricsOutput, MetricsResult> = {
  key: 'metrics',
  label: '지표와 실험 설계',
  description: '핵심 지표, 보조 지표, 가드레일과 A/B 실험안을 짜요. 전환율, 효과, 하루 대상 수를 넣으면 표본 크기와 기간을 계산해요.',
  accepts: ['prd', 'plan'],
  runningLabel: '지표와 실험을 설계하는 중이에요 (1~2분)',
  inputSchema: metricsInputSchema,
  outputSchema: metricsOutputSchema,
  prompt: METRICS_PROMPT,
  promptInput: (input) => `${METRICS_INPUT_HEADING}\n${conditionLines(input).join('\n')}`,
  compute: (out, input) => computeMetrics(out, input),
  render: renderMetrics,
};
