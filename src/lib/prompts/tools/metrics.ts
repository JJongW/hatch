/** 지표 · 실험 설계. 출력 스키마: metricsOutputSchema (src/lib/tools/metrics/index.ts) */
export const METRICS_PROMPT = `## 할 일
입력 문서(PRD 또는 기획안)의 성공을 판단할 지표와 A/B 실험을 설계한다.
- coreMetric: 핵심 지표 1개. 이 기능이 성공했는지 하나로 말해 주는 지표
- secondaryMetrics: 보조 지표 2~4개. 핵심 지표가 왜 움직였는지 설명하는 지표
- guardrails: 가드레일 1~3개. 실험 중 나빠지면 안 되는 지표 (이탈 · 오류 · 매출 등)
- 지표마다 name(짧은 이름) · definition(분자 ÷ 분모처럼 셀 수 있게, 기간 포함) · why(이 문서에서 왜 이 지표인지 한 문장)
- experiments: 실험안 1~2개. hypothesis("○○하면 ○○가 늘 것이다" 한 문장) · variants(대조군을 첫 번째로, 변형마다 한 줄 설명. 2~4개) · primaryMetric(판단 기준 지표 이름, 위 지표 중 하나)
- 표본 크기 · 기간 · 유의수준은 계산하지 않는다 (코드가 계산한다)
- 실험 조건이 주어지면 그 전환율에 맞는 지표를 primaryMetric으로 고른다`;

export const METRICS_INPUT_HEADING = '### 실험 조건 (사용자 입력)';
