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

export function renderVoc(r: VocResult) {
  const topics = r.topics.map(
    (t) =>
      `### ${t.rank}위 · ${t.name} · 점수 ${t.score}\n${t.description}\n\n` +
      `건수 ${t.count} · 평균 심각도 ${t.average ?? '없음'}\n\n` +
      (t.top.length ? t.top.map(vocLine).join('\n') : '- 이 주제로 분류된 VOC 없음'),
  );
  return [
    `## 요약\nVOC ${r.total}건 · 주제 ${r.topics.length}개 · ${UNCLASSIFIED} ${r.unclassified.count}건\n\n점수 = 건수 × 평균 심각도`,
    `## 우선순위\n${r.topics.map((t) => `- **${t.rank}위** ${t.name} — 점수 ${t.score} (건수 ${t.count} · 평균 심각도 ${t.average ?? '없음'})`).join('\n') || '- 주제 없음'}`,
    `## 주제별 대표 VOC`,
    ...topics,
    ...(r.unclassified.count ? [`## ${UNCLASSIFIED} · ${r.unclassified.count}건\n${r.unclassified.top.map(vocLine).join('\n')}`] : []),
  ].join('\n\n');
}
