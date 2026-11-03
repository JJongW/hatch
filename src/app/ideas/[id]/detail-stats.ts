import type { DocKey, Doc, Evidence } from '@/lib/storage';
import type { QuestionView, Summary } from '@/lib/summary';

import { chainProgress } from './chain-progress';

export type DetailStats = {
  docs: { done: number; total: number; stale: number };
  /** made가 false면 open, answered는 0이고 unknownTotal([확인 필요] 곳 수)을 보여 준다 */
  questions: { made: boolean; open: number; answered: number; unknownTotal: number };
  /** open: 기획안 질문 중 결정이 없는 것 전부 (화면에 안 보이는 openMore 포함) */
  decisions: { decided: number; deferred: number; proposed: number; open: number };
  /** 확인한 근거 수 · 그중 결정에 연결된 수 */
  evidence: { total: number; linked: number };
};

/** 상세 현황 4칸 숫자 (spec 2026-11-02 detail-dashboard §3). 이미 계산된 값만 센다 */
export function detailStats(
  docs: Doc[],
  running: DocKey | null,
  questions: QuestionView,
  decisions: Summary['decisions'],
  evidence: Evidence[] = [],
): DetailStats {
  const progress = chainProgress(docs, running);
  const { recorded } = decisions;
  const linked = new Set(recorded.flatMap((d) => d.evidenceIds ?? []));
  return {
    docs: { done: progress.done, total: progress.total, stale: Object.values(progress.status).filter((s) => s === 'stale').length },
    questions: {
      made: questions.made,
      open: questions.openTotal,
      answered: questions.answered,
      unknownTotal: questions.unknownTotal,
    },
    decisions: {
      decided: recorded.filter((d) => d.status === 'decided').length,
      deferred: recorded.filter((d) => d.status === 'deferred').length,
      proposed: recorded.filter((d) => d.status === 'proposed').length,
      open: decisions.open.length + decisions.openMore,
    },
    evidence: { total: evidence.length, linked: evidence.filter((e) => linked.has(e.id)).length },
  };
}
