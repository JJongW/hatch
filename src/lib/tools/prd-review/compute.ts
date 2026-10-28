export const REVIEWERS = ['개발', '디자인', '마케팅', 'CS'] as const;
export const CRITERIA = ['명확성', '실현 가능성', '측정 가능성', '사용자 가치', '위험 대응'] as const;
export type Reviewer = (typeof REVIEWERS)[number];
export type Criterion = (typeof CRITERIA)[number];
type Severity = 1 | 2 | 3;

export type PrdReviewOutput = {
  reviews: { reviewer: Reviewer; objections: { issue: string; severity: number; suggestion: string }[]; scores: { criterion: Criterion; score: number; reason: string }[] }[];
  summary: string;
};
type Snapshot = { overall: number | null; criteria: Record<Criterion, number | null>; reviewers: Record<Reviewer, number | null> };
export type PrdReviewResult = {
  summary: string;
  reviewers: { reviewer: Reviewer; average: number | null; scores: Record<Criterion, { score: number; reason: string } | null>; objections: { issue: string; severity: Severity; suggestion: string }[] }[];
  criteria: Record<Criterion, number | null>;
  overall: number | null;
  severityCounts: Record<Severity, number>;
  prev: Snapshot | null;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

export function computePrdReview(out: PrdReviewOutput, prev: PrdReviewResult | null): PrdReviewResult {
  const reviewers = REVIEWERS.map((reviewer) => {
    const r = out.reviews.find((x) => x.reviewer === reviewer); // 같은 위원이 둘이면 첫 번째
    const scores = Object.fromEntries(
      CRITERIA.map((c) => {
        const s = r?.scores.find((x) => x.criterion === c);
        return [c, s ? { score: clamp(s.score, 1, 5), reason: s.reason } : null];
      }),
    ) as Record<Criterion, { score: number; reason: string } | null>;
    const objections = (r?.objections ?? [])
      .map((o) => ({ ...o, severity: clamp(o.severity, 1, 3) as Severity }))
      .sort((a, b) => b.severity - a.severity);
    return { reviewer, average: r ? avg(CRITERIA.map((c) => scores[c]?.score ?? null)) : null, scores, objections };
  });
  const criteria = Object.fromEntries(CRITERIA.map((c) => [c, avg(reviewers.map((v) => v.scores[c]?.score ?? null))])) as Record<Criterion, number | null>;
  const severityCounts: Record<Severity, number> = { 1: 0, 2: 0, 3: 0 };
  for (const v of reviewers) for (const o of v.objections) severityCounts[o.severity] += 1;
  return {
    summary: out.summary,
    reviewers,
    criteria,
    overall: avg(reviewers.map((v) => v.average)),
    severityCounts,
    prev: prev && {
      overall: prev.overall,
      criteria: prev.criteria,
      reviewers: Object.fromEntries(prev.reviewers.map((v) => [v.reviewer, v.average])) as Record<Reviewer, number | null>,
    },
  };
}

const fmt = (n: number | null) => (n === null ? '응답 없음' : String(n));
const diff = (now: number | null, before: number | null | undefined) => {
  if (before === undefined || now === null || before === null) return '';
  const d = round1(now - before);
  return ` (이전 ${before} → ${d === 0 ? '±0' : d > 0 ? `+${d}` : d})`;
};

export function renderPrdReview(r: PrdReviewResult) {
  const objections = r.reviewers.map(
    (v) =>
      `### ${v.reviewer} 위원\n` +
      (v.objections.length ? v.objections.map((o) => `- **심각도 ${o.severity}** ${o.issue} — 제안: ${o.suggestion}`).join('\n') : '- 반론 없음'),
  );
  const scoreLines = r.reviewers.map(
    (v) =>
      `### ${v.reviewer} 위원 · 평균 ${fmt(v.average)}${diff(v.average, r.prev?.reviewers[v.reviewer])}\n` +
      CRITERIA.map((c) => (v.scores[c] ? `- ${c} ${v.scores[c]!.score} — ${v.scores[c]!.reason}` : `- ${c} 응답 없음`)).join('\n'),
  );
  return [
    `## 요약\n${r.summary}`,
    `## 반론\n심각도 3 · ${r.severityCounts[3]}건 / 2 · ${r.severityCounts[2]}건 / 1 · ${r.severityCounts[1]}건`,
    ...objections,
    `## 점수\n- 전체 평균 ${fmt(r.overall)}${diff(r.overall, r.prev?.overall)}\n` +
      CRITERIA.map((c) => `- ${c} ${fmt(r.criteria[c])}${diff(r.criteria[c], r.prev?.criteria[c])}`).join('\n'),
    ...scoreLines,
  ].join('\n\n');
}
