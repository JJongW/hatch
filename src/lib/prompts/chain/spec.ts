/** PRD → 기능명세. 출력 스키마: specSchema (src/lib/chain/steps/spec.ts) */
export const SPEC_PROMPT = `## 할 일
PRD의 요구사항을 개발 · 디자인이 바로 쓸 수 있는 기능명세로 바꾼다.
- screens: 화면마다 name · purpose(이 화면에서 사용자가 하는 일) · elements(보이는 요소) · actions(사용자 동작과 결과)
- functions: 기능마다 name · input · process · output · exceptions(오류 · 빈 값 · 권한 등). 번호는 붙이지 않는다
- dataItems: 저장하거나 주고받는 데이터 항목 이름과 설명
- PRD의 모든 P0 요구사항이 화면이나 기능 어딘가에 드러나게 한다
- openQuestions: 정책 · 예외 처리 중 결정이 필요한 것`;
