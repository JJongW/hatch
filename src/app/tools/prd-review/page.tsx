import { connection } from 'next/server';

import { compareRows } from '@/lib/tools/prd-review/compute';

import { runToolAction } from '../../actions';
import { loadToolPage } from '../_frame/load';
import ToolFrame from '../_frame/tool-frame';
import PrdCompare from './compare';

// 로컬 전용 · 항상 요청 시 렌더 (docs: route-segment-config/instant)
export const instant = false;

export default async function PrdReviewPage({ searchParams }: { searchParams: Promise<{ idea?: string; result?: string }> }) {
  await connection();
  const data = await loadToolPage('prd-review', searchParams);
  // 재리뷰(이전 결과가 있는 결과)일 때만 비교 표. 계산은 서버에서 하고 행만 넘긴다
  const rows = compareRows(data.current?.data);
  return <ToolFrame {...data} run={runToolAction.bind(null, 'prd-review')} resultSummary={rows && <PrdCompare rows={rows} />} />;
}
