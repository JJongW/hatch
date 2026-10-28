import type { z } from 'zod';

import type { DocKey } from '@/lib/storage';

export type ToolKey = 'prd-review' | 'voc' | 'metrics' | 'negotiation';
export type ToolDef<In, Out, Res> = {
  key: ToolKey;
  label: string; // 네비바 · 페이지 제목
  description: string; // 페이지 설명 한 줄
  accepts: DocKey[]; // 받는 아이디어 문서, 첫 번째가 기본
  continueLabel?: string; // 결과에서 이어 실행하는 버튼 (재리뷰 · 다음 라운드)
  inputSchema: z.ZodType<In>; // 폼 문자열 → 도구 입력. 메시지는 한국어로
  outputSchema: z.ZodType<Out>;
  prompt: string;
  promptInput: (input: In, prev: Res | null) => string; // '' 가능
  compute: (out: Out, input: In, prev: Res | null) => Res;
  render: (res: Res) => string;
};
export type AnyToolDef = ToolDef<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type ToolSource = { ideaId: string; docKey: DocKey } | { pasted: string };
