// 확인 질문 칸 계산. 이미 읽은 값만으로 — AI 없이 즉시 (요약 판과 같은 원칙)
import { QUESTION_LABEL_MAX, type Collected } from '../questions/collect';
import { QUESTION_ROLES, type Decision, type QuestionItem, type QuestionRole, type QuestionSet } from '../storage/types';

import { norm } from './parse';

export type QuestionLine = QuestionItem & { count: number };
export type QuestionView = {
  made: boolean;
  customer: QuestionLine[];
  /** QUESTION_ROLES 순서, 빈 역할은 뺀다 */
  owner: { role: QuestionRole; items: QuestionLine[] }[];
  /** 같은 질문 문장의 결정이 있는 질문 수 */
  answered: number;
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

export function questionView(set: QuestionSet | null, { groups, unnamed }: Collected, decisions: Decision[]): QuestionView {
  const count = new Map(groups.map((g) => [g.label, g.count]));
  const answeredQs = new Set(decisions.map((d) => norm(d.question)));
  const live = (set?.items ?? []).filter((q) => count.has(q.label)).map((q) => ({ ...q, count: count.get(q.label)! }));
  const open = live.filter((q) => !answeredQs.has(norm(q.question)));
  const known = new Set(set?.labels ?? []);
  return {
    made: set !== null,
    customer: open.filter((q) => q.kind === 'customer'),
    owner: QUESTION_ROLES.map((role) => ({ role, items: open.filter((q) => q.kind === 'owner' && q.role === role) })).filter(
      (g) => g.items.length > 0,
    ),
    answered: live.length - open.length,
    newLabels: set ? groups.slice(0, QUESTION_LABEL_MAX).filter((g) => !known.has(g.label)).length : 0,
    unknownTotal: groups.reduce((n, g) => n + g.count, 0) + unnamed,
    labelTotal: groups.length,
    unnamed,
    cut: Math.max(0, groups.length - QUESTION_LABEL_MAX),
    limit: QUESTION_LABEL_MAX,
  };
}
