// 확인 질문 칸 계산. 이미 읽은 값만으로 — AI 없이 즉시 (요약 판과 같은 원칙)
import { QUESTION_LABEL_MAX, type Collected } from '../questions/collect';
import { QUESTION_ROLES, type Decision, type Evidence, type QuestionItem, type QuestionRole, type QuestionSet } from '../storage/types';

import { norm } from './parse';

export type QuestionLine = QuestionItem & { count: number };
export type QuestionView = {
  made: boolean;
  customer: QuestionLine[];
  /** QUESTION_ROLES 순서, 빈 역할은 뺀다 */
  owner: { role: QuestionRole; items: QuestionLine[] }[];
  /** 팀이 정할 것 (답 = 결정) */
  decision: QuestionLine[];
  /** 먼저 볼 것 (최대 5). 점수 없이: 팀이 정할 것 먼저, 그다음 [확인 필요]가 걸린 곳이 많은 순, 같으면 목록 순.
   * customer · owner · decision에는 이 5개를 뺀 나머지만 담는다 (같은 질문이 두 번 나오지 않게) */
  first: QuestionLine[];
  /** 남은 질문 전체 수 (first 포함) */
  openTotal: number;
  /** 같은 질문 문장의 결정이나 근거가 있는 질문 수 */
  answered: number;
  /** 그중 근거로 답한 수 · 결정으로 답한 수 (둘 다 있으면 둘 다 센다) */
  byEvidence: number;
  byDecision: number;
  /** 지금 문서 라벨(앞 30개) 중 만들 때 없던 것 */
  newLabels: number;
  /** [확인 필요] 곳 수 (라벨 없는 것 포함) */
  unknownTotal: number;
  labelTotal: number;
  unnamed: number;
  /** 30개를 넘어 빠진 라벨 수 */
  cut: number;
  limit: number;
};

const FIRST_MAX = 5;

export function questionView(set: QuestionSet | null, { groups, unnamed }: Collected, decisions: Decision[], evidence: Evidence[] = []): QuestionView {
  const count = new Map(groups.map((g) => [g.label, g.count]));
  const decided = new Set(decisions.map((d) => norm(d.question)));
  const observed = new Set(evidence.filter((e) => e.question).map((e) => norm(e.question)));
  const live = (set?.items ?? []).filter((q) => count.has(q.label)).map((q) => ({ ...q, count: count.get(q.label)! }));
  const open = live.filter((q) => !decided.has(norm(q.question)) && !observed.has(norm(q.question)));
  const known = new Set(set?.labels ?? []);
  const first = open
    .map((q, i) => ({ q, i }))
    .sort((a, b) => Number(b.q.kind === 'decision') - Number(a.q.kind === 'decision') || b.q.count - a.q.count || a.i - b.i)
    .slice(0, FIRST_MAX)
    .map(({ q }) => q);
  const rest = open.filter((q) => !first.includes(q));
  return {
    made: set !== null,
    customer: rest.filter((q) => q.kind === 'customer'),
    owner: QUESTION_ROLES.map((role) => ({ role, items: rest.filter((q) => q.kind === 'owner' && q.role === role) })).filter(
      (g) => g.items.length > 0,
    ),
    decision: rest.filter((q) => q.kind === 'decision'),
    first,
    openTotal: open.length,
    answered: live.length - open.length,
    byEvidence: live.filter((q) => observed.has(norm(q.question))).length,
    byDecision: live.filter((q) => decided.has(norm(q.question))).length,
    newLabels: set ? groups.slice(0, QUESTION_LABEL_MAX).filter((g) => !known.has(g.label)).length : 0,
    unknownTotal: groups.reduce((n, g) => n + g.count, 0) + unnamed,
    labelTotal: groups.length,
    unnamed,
    cut: Math.max(0, groups.length - QUESTION_LABEL_MAX),
    limit: QUESTION_LABEL_MAX,
  };
}
