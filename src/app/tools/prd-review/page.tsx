import { connection } from 'next/server';

import { runToolAction } from '../../actions';
import { loadToolPage } from '../_frame/load';
import ToolFrame from '../_frame/tool-frame';

// 로컬 전용 · 항상 요청 시 렌더 (docs: route-segment-config/instant)
export const instant = false;

export default async function PrdReviewPage({ searchParams }: { searchParams: Promise<{ idea?: string; result?: string }> }) {
  await connection();
  const data = await loadToolPage('prd-review', searchParams);
  return <ToolFrame {...data} run={runToolAction.bind(null, 'prd-review')} />;
}
