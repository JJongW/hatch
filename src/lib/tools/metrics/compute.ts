// α 0.05(양측) · 검정력 0.8 고정. 바꾸게 되면 입력 칸으로 빼고 이 상수는 기본값으로
const Z_ALPHA = 1.959963984540054; // 정규분포 0.975 분위수
const Z_BETA = 0.8416212335729143; // 정규분포 0.8 분위수
const MAX = { secondary: 4, guardrails: 3, experiments: 2, variants: 4 };

export type Metric = { name: string; definition: string; why: string };
export type MetricsInput = { baselineRate: number | null; minEffect: number | null; dailyTraffic: number | null };
export type MetricsOutput = {
  coreMetric: Metric;
  secondaryMetrics: Metric[];
  guardrails: Metric[];
  experiments: { hypothesis: string; variants: string[]; primaryMetric: string }[];
};
export type MetricsResult = {
  core: Metric;
  secondary: Metric[];
  guardrails: Metric[];
  input: MetricsInput;
  /** 변형당 표본. 기준 전환율 · 효과가 없으면 null */
  samplePerVariant: number | null;
  experiments: { hypothesis: string; variants: string[]; primaryMetric: string; days: number | null }[];
};

/** 두 비율 비교 · 변형당 표본 (올림). p1 · effect는 비율 (0.1 = 10%) */
export function sampleSize(p1: number, effect: number) {
  const p2 = p1 * (1 + effect);
  const pBar = (p1 + p2) / 2;
  const a = Z_ALPHA * Math.sqrt(2 * pBar * (1 - pBar));
  const b = Z_BETA * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((a + b) ** 2 / (p2 - p1) ** 2);
}

/** 필요 기간(일) = 표본 × 변형 수 ÷ 하루 대상 수 (올림) */
export const durationDays = (sample: number, variants: number, daily: number) => Math.ceil((sample * variants) / daily);

export function computeMetrics(out: MetricsOutput, input: MetricsInput): MetricsResult {
  const { baselineRate, minEffect, dailyTraffic } = input;
  const samplePerVariant = baselineRate !== null && minEffect !== null ? sampleSize(baselineRate / 100, minEffect / 100) : null;
  return {
    core: out.coreMetric,
    secondary: out.secondaryMetrics.slice(0, MAX.secondary),
    guardrails: out.guardrails.slice(0, MAX.guardrails),
    input,
    samplePerVariant,
    experiments: out.experiments.slice(0, MAX.experiments).map((e) => {
      const variants = e.variants.slice(0, MAX.variants);
      return {
        ...e,
        variants,
        days: samplePerVariant !== null && dailyTraffic !== null ? durationDays(samplePerVariant, variants.length, dailyTraffic) : null,
      };
    }),
  };
}

const num = (n: number) => n.toLocaleString('ko-KR');
const check = (labels: string[]) => `[확인 필요: ${labels.join(' · ')}]`;
const missingFor = (input: MetricsInput, withTraffic: boolean) =>
  [
    input.baselineRate === null && '기준 전환율',
    input.minEffect === null && '최소 감지 효과',
    withTraffic && input.dailyTraffic === null && '하루 실험 대상 수',
  ].filter((s): s is string => Boolean(s));

const metricLines = (ms: Metric[]) => ms.map((m) => `- **${m.name}** — ${m.definition}\n  - 왜: ${m.why}`).join('\n') || '- 없음';

/** 사용자 입력 → 프롬프트 줄 · 결과 조건 줄에 같이 쓴다 */
export const conditionLines = (i: MetricsInput) => [
  `- 기준 전환율 ${i.baselineRate === null ? check(['기준 전환율']) : `${i.baselineRate}%`}`,
  `- 최소 감지 효과 ${i.minEffect === null ? check(['최소 감지 효과']) : `${i.minEffect}% (상대)`}`,
  `- 하루 실험 대상 ${i.dailyTraffic === null ? check(['하루 실험 대상 수']) : `${num(i.dailyTraffic)}명`}`,
];

export function renderMetrics(r: MetricsResult) {
  const sample = r.samplePerVariant === null ? check(missingFor(r.input, false)) : `${num(r.samplePerVariant)}명`;
  const experiments = r.experiments.map((e, i) => {
    const days =
      e.days === null
        ? check(missingFor(r.input, true))
        : `${num(e.days)}일 (${num(r.samplePerVariant!)}명 × ${e.variants.length}개 ÷ 하루 ${num(r.input.dailyTraffic!)}명)`;
    return [
      `### 실험 ${i + 1}`,
      `- 가설: ${e.hypothesis}`,
      `- 변형 ${e.variants.length}개`,
      ...e.variants.map((v) => `  - ${v}`),
      `- 주요 지표: ${e.primaryMetric}`,
      `- 필요 기간: ${days}`,
    ].join('\n');
  });
  return [
    `## 핵심 지표\n${metricLines([r.core])}`,
    `## 보조 지표\n${metricLines(r.secondary)}`,
    `## 가드레일\n${metricLines(r.guardrails)}`,
    `## 실험 조건\n${conditionLines(r.input).join('\n')}\n- 유의수준 α 0.05 (양측) · 검정력 0.8\n- 변형당 표본: ${sample}`,
    `## 실험 설계`,
    ...experiments,
  ].join('\n\n');
}
