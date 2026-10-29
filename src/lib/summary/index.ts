// 아이디어 상세 요약 판. 이미 읽은 값만으로 계산한다 — AI 없이 즉시 · 무료 · 같은 문서면 같은 요약
import { countUnknowns, firstParagraph, planDecisions, section } from './parse';

import type { Doc, DocKey } from '../storage/types';

export type VocEvidence = { total: number; top: string };

export type NextAction =
  | { kind: 'wait'; doc: DocKey }
  | { kind: 'check-stale'; doc: DocKey }
  | { kind: 'make-doc'; doc: DocKey }
  | { kind: 'collect-voc' }
  | { kind: 'review-prd' }
  | { kind: 'done' };

export type SummaryInput = {
  idea: { title: string; memo: string };
  docs: Doc[];
  running: DocKey | null;
  /** 이 아이디어의 최신 VOC 결과 */
  voc: VocEvidence | null;
  /** 이 아이디어 PRD로 돌린 PRD 리뷰가 있나 */
  reviewedPrd: boolean;
};

export type Summary = {
  problem: { text: string; from: 'plan' | 'memo' | 'title' };
  evidence: { voc: VocEvidence | null };
  unknowns: { label: string; count: number }[];
  unknownTotal: number;
  decisions: string[];
  next: NextAction;
};

const MAX = 5;

/** VOC 결과 data에서 근거 한 줄. 모양이 다르면 null — 깨진 결과로 화면이 죽지 않게 */
export function vocEvidence(data: unknown): VocEvidence | null {
  if (typeof data !== 'object' || data === null) return null;
  const { total, topics } = data as { total?: unknown; topics?: unknown };
  if (typeof total !== 'number' || !Array.isArray(topics)) return null;
  const top: unknown = (topics[0] as { name?: unknown } | undefined)?.name;
  return typeof top === 'string' ? { total, top } : null;
}

function problemOf(idea: SummaryInput['idea'], plan: string | null): Summary['problem'] {
  const fromPlan = plan ? firstParagraph(section(plan, '문제') ?? '') : '';
  if (fromPlan) return { text: fromPlan, from: 'plan' };
  const fromMemo = firstParagraph(idea.memo);
  if (fromMemo) return { text: fromMemo, from: 'memo' };
  return { text: idea.title, from: 'title' };
}

// 위에서부터 첫 번째 하나 (spec §3 다음 행동 규칙)
function nextOf({ docs, running, voc, reviewedPrd }: SummaryInput, unknownTotal: number): NextAction {
  if (running) return { kind: 'wait', doc: running };
  const stale = docs.find((d) => d.content !== null && d.stale);
  if (stale) return { kind: 'check-stale', doc: stale.key };
  const has = (key: DocKey) => docs.some((d) => d.key === key && d.content !== null);
  if (!has('plan')) return { kind: 'make-doc', doc: 'plan' };
  if (!voc && unknownTotal > 0) return { kind: 'collect-voc' };
  if (has('prd') && !reviewedPrd) return { kind: 'review-prd' };
  const missing = docs.find((d) => d.content === null);
  if (missing) return { kind: 'make-doc', doc: missing.key };
  return { kind: 'done' };
}

export function summarize(input: SummaryInput): Summary {
  const plan = input.docs.find((d) => d.key === 'plan')?.content ?? null;
  const unknowns = countUnknowns(input.docs.flatMap((d) => (d.content === null ? [] : [d.content])));
  return {
    problem: problemOf(input.idea, plan),
    evidence: { voc: input.voc },
    unknowns: unknowns.slice(0, MAX),
    unknownTotal: unknowns.length,
    decisions: plan ? planDecisions(plan).slice(0, MAX) : [],
    next: nextOf(input, unknowns.length),
  };
}
