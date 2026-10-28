/** VOC 우선순위. 출력 스키마: vocOutputSchema (src/lib/tools/voc/index.ts) */
export const VOC_PROMPT = `## 할 일
번호가 붙은 VOC(고객의 소리)를 주제로 묶고 줄마다 심각도를 매긴다. 입력 문서가 있으면 그 제품 맥락으로만 참고한다.
- topics: 주제 3~8개 (VOC가 3줄보다 적으면 줄 수만큼). name(짧은 명사구) · description(어떤 불만 · 요청인지 한 문장)
- 주제끼리 겹치지 않게 나눈다. "기타" 같은 주제는 만들지 않는다
- items: VOC 줄마다 하나. line(VOC 번호) · topic(topics의 name 그대로) · severity(1~5 정수)
- severity: 1 사소한 의견 · 2 불편 · 3 자주 막힘 · 4 핵심 기능이 안 됨 · 5 이탈 · 결제 · 데이터 손실 위험
- 어느 주제에도 맞지 않는 줄은 가장 가까운 주제로 넣는다. 줄을 빠뜨리지 않는다`;

export const VOC_HEADING = '### VOC (번호. 내용)';
