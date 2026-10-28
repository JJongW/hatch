/** 아이디어 → 상세 기획안. 출력 스키마: planSchema (src/lib/chain/steps/plan.ts) */
export const PLAN_PROMPT = `## 할 일
아이디어 메모를 상세 기획안으로 펼친다.
- summary: 한 줄 요약 (40자 안팎)
- problem: 누가 어떤 상황에서 무엇 때문에 불편한가
- targetUsers: 핵심 사용자 1~3그룹
- value: 이 서비스만의 핵심 가치
- features: 주요 기능 3~6개 (name · description)
- successMetrics: 성공을 판단할 지표 2~4개 (지표 이름과 이유, 목표 수치는 [확인 필요: 목표 수치])
- risks: 가장 큰 위험 2~4개
- openQuestions: 기획을 이어 가기 전에 확인할 것`;
