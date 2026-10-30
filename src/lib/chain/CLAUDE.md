# src/lib/chain/ — 문서 생성 체인 (B)

담당: `chain-author` · 단계 추가 절차: `chain-step` 스킬

## 체인
아이디어 → 상세 기획안 → 개발 로드맵 → PRD → 기능명세서 → 개발 프롬프트 / (데이터 구성 → 디자인 프롬프트)
`registry.ts`에 7단계 모두 등록 (plan · roadmap · prd · spec · data · dev-prompt · design-prompt).
`extra`: prd ← plan, design-prompt ← spec. 개발 프롬프트는 spec에서, 디자인 프롬프트는 data에서 이어진다.

## 파일 지도
- `types.ts` — `ChainStep` (key · extra · schema · prompt · render)
- `steps/<key>.ts` — 단계 하나 = 파일 하나 (zod 스키마 + md 렌더). 테스트는 옆에
- `registry.ts` — `CHAIN` · `GENERATABLE` (generate와 index 사이 순환 import 방지)
- `build-prompt.ts` — 공통 규칙 + 단계 프롬프트 + 입력 문서 이어 붙이기
- `generate.ts` — `generateDoc(id, key)`: 앞 문서 읽기 → claude → 스키마 검사 → md 저장
- `index.ts` — 밖에서 import하는 입구 (`generateDoc` · `GENERATABLE` · `ChainError`)

## 규칙
- 앞 단계(`from`)는 storage의 `DOC_STEPS`에 있다 (stale 계산 때문)
- 각 단계는 앞 단계 결과만 입력으로 받는다 (건너뛰지 않음). 더 필요하면 `extra`
- 실제 호출은 `src/lib/claude/run.ts` 한 곳
- AI 출력은 스키마 검사 후 저장. 실패하면 `ChainError` 한국어 한 줄. 생성 중 표시는 항상 지운다

## 하지 말 것
- 이 폴더에 프롬프트 문장 (→ `src/lib/prompts/`)
- 화면 코드, 저장 직접 접근 (→ `src/lib/storage/` 함수)
