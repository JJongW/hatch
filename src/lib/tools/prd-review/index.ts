import { z } from 'zod';

import { PRD_REVIEW_PREV_HEADING, PRD_REVIEW_PROMPT } from '@/lib/prompts/tools/prd-review';

import type { ToolDef } from '../types';

import { computePrdReview, CRITERIA, renderPrdReview, REVIEWERS, type PrdReviewOutput, type PrdReviewResult } from './compute';

export const prdReviewOutputSchema = z.object({
  reviews: z.array(
    z.object({
      reviewer: z.enum(REVIEWERS),
      objections: z.array(z.object({ issue: z.string().min(1), severity: z.number(), suggestion: z.string().min(1) })),
      scores: z.array(z.object({ criterion: z.enum(CRITERIA), score: z.number(), reason: z.string().min(1) })),
    }),
  ),
  summary: z.string().min(1),
}) satisfies z.ZodType<PrdReviewOutput>;

export const prdReviewTool: ToolDef<Record<string, never>, PrdReviewOutput, PrdReviewResult> = {
  key: 'prd-review',
  label: 'PRD 리뷰 위원회',
  description: '개발, 디자인, 마케팅, CS 위원이 반론부터 내고 기준별로 채점해요. 고친 판을 다시 돌리면 전후 차이를 보여 줘요.',
  accepts: ['prd', 'spec', 'plan'],
  continueLabel: '고친 판 다시 리뷰',
  runningLabel: '위원회가 읽는 중이에요 (1~2분)',
  inputSchema: z.object({}).strip() as z.ZodType<Record<string, never>>,
  outputSchema: prdReviewOutputSchema,
  prompt: PRD_REVIEW_PROMPT,
  promptInput: (_i, prev) =>
    prev
      ? `${PRD_REVIEW_PREV_HEADING}\n${prev.reviewers.flatMap((v) => v.objections.map((o) => `- [${v.reviewer}] ${o.issue}`)).join('\n') || '- 없음'}`
      : '',
  compute: (out, _i, prev) => computePrdReview(out, prev),
  render: renderPrdReview,
};
