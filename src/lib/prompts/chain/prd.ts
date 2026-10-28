/** 로드맵 → PRD. 출력 스키마: prdSchema (src/lib/chain/steps/prd.ts) */
export const PRD_PROMPT = `## 할 일
개발 로드맵의 첫 마일스톤(MVP) 범위만 PRD로 쓴다. 기획안은 배경 이해에만 쓴다.
- background: 왜 지금 이 MVP를 만드는가
- goals / nonGoals: MVP가 이루려는 것 / 일부러 하지 않는 것
- userStories: as(사용자) · want(하고 싶은 것) · soThat(얻는 것)
- requirements: content(요구사항 한 문장) · priority(P0 꼭 필요 · P1 있으면 좋음 · P2 나중). 번호는 붙이지 않는다
- metrics: MVP 성공 판단 지표. 목표 수치는 [확인 필요: 목표 수치]
- releaseScope: 출시에 포함되는 범위 한 문단
- openQuestions: 결정이 필요한 것`;
