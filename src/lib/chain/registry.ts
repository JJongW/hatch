import type { DocKey } from '@/lib/storage';

import { planStep } from './steps/plan';
import type { ChainStep } from './types';

/** 단계 등록부. 순서는 storage DOC_STEPS. B-2에서 나머지 5개를 한 줄씩 추가 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHAIN: Partial<Record<DocKey, ChainStep<any>>> = {
  plan: planStep,
};

export const GENERATABLE = Object.keys(CHAIN) as DocKey[];
