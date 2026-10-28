import type { z } from 'zod';

import type { DocKey } from '@/lib/storage';

export type ToolKey = 'prd-review' | 'voc' | 'metrics' | 'negotiation';
export type ToolDef<In, Out, Res> = {
  key: ToolKey;
  label: string; // 네비바 · 페이지 제목
  description: string; // 페이지 설명 한 줄
  accepts: DocKey[]; // 받는 아이디어 문서, 첫 번째가 기본
  continueLabel?: string; // 결과에서 이어 실행하는 버튼 (재리뷰 · 다음 라운드)
  runningLabel?: string; // 실행 중 안내. 기본 '실행 중이에요 (1~2분)'
  sourceOptional?: true; // 입력 문서 없이도 실행 (VOC). 프레임에 '문서 없이' 선택이 생기고 프롬프트에 문서 블록이 빠진다
  inputSchema: z.ZodType<In>; // 폼 문자열 → 도구 입력. 메시지는 한국어로
  /** 입력 칸 검사 뒤 · claude 실행 전에 부른다. 문자열을 돌려주면 그 메시지로 거절 (이전 결과에 따라 규칙이 다를 때) */
  validate?: (input: In, prev: Res | null) => string | undefined;
  outputSchema: z.ZodType<Out>;
  prompt: string;
  promptInput: (input: In, prev: Res | null) => string; // '' 가능
  compute: (out: Out, input: In, prev: Res | null) => Res;
  render: (res: Res) => string;
};
export type AnyToolDef = ToolDef<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type ToolSource = { ideaId: string; docKey: DocKey } | { pasted: string } | { none: true };
