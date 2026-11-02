import { connection } from 'next/server';

import { TOOLS, type ToolKey } from '@/lib/tools';
import type { ToolInfo } from '@/lib/try/flow';
import { loadTryFixture } from '@/lib/try/load';

import TryFlow from './try-flow';

// 예시 파일을 요청 때 읽는다 (docs: route-segment-config/instant, 'Disabling instant')
export const instant = false;

const info = (key: ToolKey): ToolInfo => {
  const t = TOOLS[key]!;
  return { label: t.label, description: t.description, continueLabel: t.continueLabel };
};

// 흐름 체험: 예시 결과로 사용자 테스트 과제를 해 본다. 서버에 쓰지 않는다 (spec 2026-11-02-try)
export default async function TryPage() {
  await connection();
  const base = await loadTryFixture();
  return <TryFlow fixture={{ ...base, tools: { prdReview: info('prd-review'), voc: info('voc') } }} />;
}
