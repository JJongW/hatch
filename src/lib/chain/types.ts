import type { z } from 'zod';

import type { DocKey } from '@/lib/storage';

/** 체인 단계 하나. 앞 단계(from)는 storage의 DOC_STEPS에 있다. */
export type ChainStep<T> = {
  key: DocKey;
  /** from 말고 함께 넣는 문서 (예: prd ← plan) */
  extra?: DocKey[];
  schema: z.ZodType<T>;
  /** src/lib/prompts/chain/<key>.ts 의 상수 */
  prompt: string;
  /** AI 출력(JSON) → md. 형식은 코드가 만든다 */
  render: (out: T) => string;
};
