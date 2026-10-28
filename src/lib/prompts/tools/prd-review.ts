/** PRD 리뷰 위원회. 출력 스키마: prdReviewOutputSchema (src/lib/tools/prd-review/index.ts) */
export const PRD_REVIEW_PROMPT = `## 할 일
입력 문서(PRD)를 위원 4명이 각자 관점에서 리뷰한다. 위원: 개발 · 디자인 · 마케팅 · CS.
- reviews: 위원마다 하나. reviewer는 위원 이름
- objections를 먼저 쓴다: 이 문서로 일을 시작하면 막히는 점. issue(무엇이 문제인지) · severity(1 사소함 · 2 고치는 게 좋음 · 3 이대로면 출시 못 함) · suggestion(어떻게 고칠지)
- 반론이 없으면 빈 배열. 칭찬은 쓰지 않는다
- scores: 기준 5개 모두. criterion · score(1~5 정수) · reason(한 문장)
- 기준: 명확성 · 실현 가능성 · 측정 가능성 · 사용자 가치 · 위험 대응
- summary: 위원회 결론 두세 문장
- 이전 리뷰가 있으면 그 반론이 고쳐졌는지 보고, 고쳐진 반론은 다시 쓰지 않는다`;

export const PRD_REVIEW_PREV_HEADING = '### 이전 리뷰의 반론';
