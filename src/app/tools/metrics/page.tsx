import { connection } from 'next/server';

import { runToolAction } from '../../actions';
import { loadToolPage } from '../_frame/load';
import ToolFrame from '../_frame/tool-frame';

import MetricsInputs from './inputs';

// 로컬 전용 · 항상 요청 시 렌더 (docs: route-segment-config/instant)
export const instant = false;

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ idea?: string; result?: string }> }) {
  await connection();
  const data = await loadToolPage('metrics', searchParams);
  return <ToolFrame {...data} inputFields={<MetricsInputs />} run={runToolAction.bind(null, 'metrics')} />;
}
