import { connection } from 'next/server';

import { DOC_STEPS, isValidId, listIdeas, listUsage } from '@/lib/storage';
import { TOOLS } from '@/lib/tools';
import { summarizeUsage } from '@/lib/usage/summary';

import WidePage from '../_components/wide-page';
import UsageView from './usage-view';

// 로컬 전용 · 항상 요청 시 렌더라 정적 셸 검증을 끈다 (docs: route-segment-config/instant, 'Disabling instant')
export const instant = false;

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ idea?: string }> }) {
  await connection();
  const [{ entries, unreadable }, { ideas }, { idea }] = await Promise.all([
    listUsage(),
    listIdeas().catch(() => ({ ideas: [], unreadable: 0 })),
    searchParams,
  ]);
  const titles = Object.fromEntries(ideas.map((i) => [i.id, i.title]));
  const ideaId = idea && isValidId(idea) ? idea : undefined;
  // 기능 이름: 문서는 단계 이름, 도구는 도구 이름 (feature로 구분해 key가 겹쳐도 안전)
  const labels: Record<string, string> = {
    'questions:questions': '확인 질문',
    ...Object.fromEntries(DOC_STEPS.map((s) => [`doc:${s.key}`, s.label])),
    ...Object.fromEntries(Object.values(TOOLS).map((t) => [`tool:${t!.key}`, t!.label])),
  };
  return (
    <>
      <WidePage />
      <UsageView
        summary={summarizeUsage(entries, ideaId)}
        labels={labels}
        titles={titles}
        ideaFilter={ideaId ? { id: ideaId, title: titles[ideaId] ?? '휴지통으로 보낸 아이디어' } : null}
        unreadable={unreadable}
      />
    </>
  );
}
