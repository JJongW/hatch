export const MAX_VOC_LINES = 200;
export const UNCLASSIFIED = '분류 안 됨';

export type VocInput = { lines: string[] };
export type VocOutput = {
  topics: { name: string; description: string }[];
  items: { line: number; topic: string; severity: number }[];
};
type Voc = { line: number; text: string; severity: number };
export type VocResult = {
  total: number;
  topics: { rank: number; name: string; description: string; count: number; average: number | null; score: number; top: Voc[] }[];
  /** 빠진 줄(severity null) · 없는 주제로 분류된 줄 */
  unclassified: { count: number; top: (Omit<Voc, 'severity'> & { severity: number | null })[] };
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;
const bySeverity = (a: { line: number; severity: number | null }, b: { line: number; severity: number | null }) =>
  (b.severity ?? 0) - (a.severity ?? 0) || a.line - b.line;

export function computeVoc(out: VocOutput, { lines }: VocInput): VocResult {
  const topics = out.topics.filter((t, i) => out.topics.findIndex((x) => x.name === t.name) === i); // 같은 주제가 둘이면 첫 번째
  const groups = new Map(topics.map((t) => [t.name, [] as Voc[]]));
  const unclassified: VocResult['unclassified']['top'] = [];

  lines.forEach((text, i) => {
    const line = i + 1;
    const item = out.items.find((x) => x.line === line); // 같은 줄이 둘이면 첫 번째
    const group = item && groups.get(item.topic);
    if (!item) unclassified.push({ line, text, severity: null });
    else if (!group) unclassified.push({ line, text, severity: clamp(item.severity, 1, 5) });
    else group.push({ line, text, severity: clamp(item.severity, 1, 5) });
  });

  const ranked = topics
    .map((t) => {
      const vocs = groups.get(t.name)!;
      const average = vocs.length ? round1(vocs.reduce((a, v) => a + v.severity, 0) / vocs.length) : null;
      // 점수 = 건수 × 평균 심각도 (= 심각도 합). 반올림 전 평균으로 계산한다
      const score = vocs.reduce((a, v) => a + v.severity, 0);
      return { name: t.name, description: t.description, count: vocs.length, average, score, top: [...vocs].sort(bySeverity).slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count); // 안정 정렬이라 나머지는 입력 순
  // 점수가 같으면 같은 순위 (1, 2, 2, 4). 같은 순위 안에서는 건수 많은 순 → 입력 순으로 놓는다
  const withRank = ranked.map((t) => ({ rank: 1 + ranked.filter((x) => x.score > t.score).length, ...t }));

  return { total: lines.length, topics: withRank, unclassified: { count: unclassified.length, top: unclassified.sort(bySeverity).slice(0, 3) } };
}

const vocLine = (v: { line: number; text: string; severity: number | null }) =>
  `- ${v.severity === null ? '**주제 없음**' : `**심각도 ${v.severity}**`} (${v.line}번) ${v.text}`;

// 점수는 출발점일 뿐 — 최종 우선순위는 사람이 고객군 · 목표 · 비용을 보고 정한다 (피드백 8)
const CHECKS = [
  '고객군: 이 불만은 어느 고객군에서 나왔고, 그 고객군이 지금 목표 고객인가?',
  '제품 목표: 고치면 이번 목표 지표가 움직이나?',
  '해결 비용: 고치는 데 얼마나 드나? 작게 먼저 풀 방법이 있나?',
];

export function renderVoc(r: VocResult) {
  const topics = r.topics.map(
    (t) =>
      `### ${t.rank}. ${t.name}\n${t.description}\n\n` +
      `건수 ${t.count}, 평균 심각도 ${t.average ?? '없음'}\n\n` +
      (t.top.length ? t.top.map(vocLine).join('\n') : '- 이 주제로 분류된 VOC 없음'),
  );
  return [
    `## 요약\nVOC ${r.total}건, 주제 ${r.topics.length}개, ${UNCLASSIFIED} ${r.unclassified.count}건`,
    `## 출발 순위\n건수 × 평균 심각도로 매긴 출발점이에요. 실제 우선순위는 아래 질문을 보고 정해요.\n\n` +
      (r.topics.map((t) => `- **${t.rank}** ${t.name} — 건수 ${t.count}, 평균 심각도 ${t.average ?? '없음'} (합 ${t.score})`).join('\n') || '- 주제 없음'),
    `## 순위를 정하기 전에 볼 것\n${CHECKS.map((c) => `- ${c}`).join('\n')}`,
    `## 주제별 대표 VOC`,
    ...topics,
    ...(r.unclassified.count ? [`## ${UNCLASSIFIED}: ${r.unclassified.count}건\n${r.unclassified.top.map(vocLine).join('\n')}`] : []),
  ].join('\n\n');
}

// 결과 맨 위 거르기 칩 (spec tool-result-view §3). 기준 값은 칩 글자에 그대로 적는다
export const VOC_SEVERE = 3;
export const VOC_FREQUENT = 5;
export type VocFilterKey = 'all' | 'severe' | 'frequent';
export type VocRow = Pick<VocResult['topics'][number], 'rank' | 'name' | 'count' | 'average' | 'score'> & { filters: VocFilterKey[] };
export type VocSummary = { rows: VocRow[]; filters: { key: VocFilterKey; label: string; count: number }[] };

/** 저장된 data로 칩과 표를 만든다. 주제가 없거나 모양이 다르면 null (요약을 그리지 않는다) */
export function vocSummary(data: unknown): VocSummary | null {
  const r = data as Partial<VocResult> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.topics) || r.topics.length === 0) return null;
  const rows = r.topics.map(({ rank, name, count, average, score }) => {
    const filters: VocFilterKey[] = ['all'];
    if (average !== null && average >= VOC_SEVERE) filters.push('severe');
    if (count >= VOC_FREQUENT) filters.push('frequent');
    return { rank, name, count, average, score, filters };
  });
  const labels: [VocFilterKey, string][] = [
    ['all', '전체'],
    ['severe', `심각 (평균 심각도 ${VOC_SEVERE} 이상)`],
    ['frequent', `자주 나옴 (${VOC_FREQUENT}건 이상)`],
  ];
  return { rows, filters: labels.map(([key, label]) => ({ key, label, count: rows.filter((x) => x.filters.includes(key)).length })) };
}
