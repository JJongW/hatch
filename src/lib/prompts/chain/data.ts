/** 기능명세 → 데이터 구성. 출력 스키마: dataSchema (src/lib/chain/steps/data.ts) */
export const DATA_PROMPT = `## 할 일
기능명세의 화면 · 기능 · 데이터 항목을 와이어프레임 전에 쓸 데이터 구성으로 정리한다.
- entities: 저장하거나 화면에 보이는 데이터 묶음. key는 영문 snake_case(예: class_booking), name은 한국어, description은 한 문장
- fields: 엔티티마다 key(영문 snake_case) · name · type · required · example · screens. 한 엔티티 안에서 key가 겹치지 않게 한다
- 기능명세의 화면 구성 요소가 모두 어떤 필드에 연결되게 한다
- type: text · number · boolean · date · enum · file · ref 중 하나. 다른 엔티티를 가리키는 칸은 ref
- example: 와이어프레임에 그대로 넣을 실제 같은 예시값 하나. 근거가 없으면 [확인 필요: ○○]
- screens: 이 필드를 보여 주거나 입력받는 화면. 기능명세의 화면 이름을 그대로 쓴다
- relations: 엔티티 사이 관계. from · to에는 entities의 key만 쓴다. kind는 1:1 · 1:N · N:M, label은 짧은 동사(예: 예약한다)
- openQuestions: 보관 기간 · 개인정보 · 필수 여부처럼 정해야 하는 것`;
