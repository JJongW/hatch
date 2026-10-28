import type { DocKey } from '@/lib/storage';

import { designPromptStep } from './steps/design-prompt';
import { devPromptStep } from './steps/dev-prompt';
import { planStep } from './steps/plan';
import { prdStep } from './steps/prd';
import { roadmapStep } from './steps/roadmap';
import { specStep } from './steps/spec';
import type { ChainStep } from './types';

/** 단계 등록부. 순서는 storage DOC_STEPS. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHAIN: Partial<Record<DocKey, ChainStep<any>>> = {
  plan: planStep,
  roadmap: roadmapStep,
  prd: prdStep,
  spec: specStep,
  'dev-prompt': devPromptStep,
  'design-prompt': designPromptStep,
};

export const GENERATABLE = Object.keys(CHAIN) as DocKey[];
