import { connection } from 'next/server';

import { MAX_ANSWER_CHARS } from '@/lib/tools/negotiation/compute';

import { runToolAction } from '../../actions';
import { loadToolPage } from '../_frame/load';
import ToolFrame from '../_frame/tool-frame';

import NegotiationInputs from './inputs';

// 로컬 전용 · 항상 요청 시 렌더 (docs: route-segment-config/instant)
export const instant = false;

export default async function NegotiationPage({ searchParams }: { searchParams: Promise<{ idea?: string; result?: string }> }) {
  await connection();
  const data = await loadToolPage('negotiation', searchParams);
  return (
    <ToolFrame
      {...data}
      run={runToolAction.bind(null, 'negotiation')}
      inputFields={<NegotiationInputs resultId={data.current?.id ?? null} maxChars={MAX_ANSWER_CHARS} />}
    />
  );
}
