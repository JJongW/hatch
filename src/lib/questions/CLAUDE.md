# src/lib/questions/ — 확인 질문 (4b)

담당: `ui-builder` · 설계: [4b spec](../../../docs/specs/2026-10-29-confirm-questions-design.md)

## 파일 지도
- `index.ts` — 밖에서 import하는 유일한 입구
- `collect.ts` — 문서 전체에서 `[확인 필요: X]`를 라벨로 묶기 (많은 순 30개 · 예시 줄 2개)
- `validate.ts` — claude 출력 스키마 · 검사 (모르는 라벨 · 중복 · 빠진 라벨이면 실패)
- `make.ts` — 프롬프트 조립 → `runClaude` → 검사 → `saveQuestions` (`server-only`)
- `questions.test.ts` — 가짜 claude(`fake-claude.mjs` `questions` 모드)로 저장까지

## 규칙
- AI는 분류 · 문장만. 라벨 모으기 · 개수 · 답함 계산은 코드 (답함은 `summary/questions.ts`)
- 라벨 정규화는 `summary/parse.ts`의 `norm` · `unknownLabel`을 같이 쓴다 (두 곳에 규칙 만들지 않기)
- 프롬프트 문자열은 `src/lib/prompts/questions.ts`에만
- 사용자에게 보일 실패는 `ChainError` 문구로

## 하지 말 것
- 화면 컴포넌트 import · 파일 직접 쓰기 (→ `src/lib/storage/`)
