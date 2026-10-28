/** 기능명세 → 디자인 프롬프트. 출력 스키마: designPromptSchema (src/lib/chain/steps/design-prompt.ts) */
export const DESIGN_PROMPT_PROMPT = `## 할 일
기능명세를 디자인 도구(Figma AI · v0 · Claude 등)에 그대로 붙여 넣을 디자인 프롬프트로 바꾼다.
- prompt: 화면마다 목적 · 구성 요소 · 상태(빈 화면 · 오류 · 로딩) · 주요 동작을 담은 본문. 이 칸만은 줄바꿈과 "1)" 같은 번호를 써도 된다
- screens: 그릴 화면 이름 목록
- tone: 시각 톤 한두 문장 (기능명세에 근거가 없으면 [확인 필요: 브랜드 톤 등])
- references: 참고할 만한 일반 UI 패턴 이름 (특정 회사 디자인을 베끼라고 하지 않는다)`;
