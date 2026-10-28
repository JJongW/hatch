/** 기획안 → 개발 로드맵. 출력 스키마: roadmapSchema (src/lib/chain/steps/roadmap.ts) */
export const ROADMAP_PROMPT = `## 할 일
기획안을 개발 로드맵으로 나눈다. 첫 마일스톤은 가장 작게 출시할 수 있는 MVP다.
- overview: 로드맵 전체를 두세 문장으로
- milestones: 2~4개, 앞에서부터 출시 순서. 각각 name(짧은 이름) · goal(이 단계로 증명할 것) · scope(포함 기능) · doneWhen(완료 기준, 확인 가능한 문장)
- MVP에는 기획안의 핵심 가치를 증명하는 데 꼭 필요한 기능만 넣는다
- outOfScope: 기획안에 있지만 이번 로드맵에서 뺀 것과 이유
- openQuestions: 일정 · 인력 · 기술처럼 입력에 없는 것
- 기간 · 일정 수치는 지어내지 말고 [확인 필요]`;
