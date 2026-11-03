import { connection } from 'next/server';

import { isDemo } from '@/lib/demo';
import { vocLines, vocSummary } from '@/lib/tools/voc/compute';

import { runToolAction } from '../../actions';
import { loadToolPage } from '../_frame/load';
import ToolFrame from '../_frame/tool-frame';
import VocInputLines from './input-lines';
import VocInputs from './inputs';
import VocSummary from './summary';

// 로컬 전용 · 항상 요청 시 렌더 (docs: route-segment-config/instant)
export const instant = false;

export default async function VocPage({ searchParams }: { searchParams: Promise<{ idea?: string; result?: string }> }) {
  await connection();
  const data = await loadToolPage('voc', searchParams);
  const summary = vocSummary(data.current?.data);
  return (
    <ToolFrame
      {...data}
      run={runToolAction.bind(null, 'voc')}
      inputFields={<VocInputs shown={isDemo() && data.current ? vocLines(data.current.data) : undefined} />}
      resultSummary={
        data.current && (
          <>
            {summary && <VocSummary {...summary} />}
            <VocInputLines lines={vocLines(data.current.data)} />
          </>
        )
      }
    />
  );
}
