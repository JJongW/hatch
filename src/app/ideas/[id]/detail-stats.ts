import type { DocKey, Doc } from '@/lib/storage';
import type { QuestionView, Summary } from '@/lib/summary';

import { chainProgress } from './chain-progress';

export type DetailStats = {
  docs: { done: number; total: number; stale: number };
  /** made가 false면 open, answered는 0이고 unknownTotal([확인 필요] 곳 수)을 보여 준다 */
  questions: { made: boolean; open: number; answered: number; unknownTotal: number };
  /** open: 기획안 질문 중 결정이 없는 것 전부 (화면에 안 보이는 openMore 포함) */
  decisions: { decided: number; deferred: number; open: number };
};

/** 상세 현황 3칸 숫자 (spec 2026-11-02 detail-dashboard §3). 이미 계산된 값만 센다 */
export function detailStats(docs: Doc[], running: DocKey | null, questions: QuestionView, decisions: Summary['decisions']): DetailStats {
  const progress = chainProgress(docs, running);
  const { recorded } = decisions;
  return {
    docs: { done: progress.done, total: progress.total, stale: Object.values(progress.status).filter((s) => s === 'stale').length },
    questions: {
      made: questions.made,
      open: questions.customer.length + questions.owner.reduce((n, g) => n + g.items.length, 0),
      answered: questions.answered,
      unknownTotal: questions.unknownTotal,
    },
    decisions: {
      decided: recorded.filter((d) => d.status === 'decided').length,
      deferred: recorded.filter((d) => d.status === 'deferred').length,
      open: decisions.open.length + decisions.openMore,
    },
  };
}
