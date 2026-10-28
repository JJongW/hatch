import { metricsTool } from './metrics';
import { prdReviewTool } from './prd-review';
import type { AnyToolDef, ToolKey } from './types';

/** 등록된 도구. 도구가 하나씩 완성될 때 여기에 추가한다 */
export const TOOLS: Partial<Record<ToolKey, AnyToolDef>> = {
  'prd-review': prdReviewTool,
  metrics: metricsTool,
};

export { MAX_SOURCE_CHARS, runTool } from './run';
export { ChainError, isClaudeBusy } from '@/lib/claude/run';
export type { AnyToolDef, ToolKey, ToolSource } from './types';
