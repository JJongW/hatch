# src/lib/tools/ — 도구 실행기 · 정의 (C)

담당: `tool-builder` · 화면은 `src/app/tools/` · 추가 절차: `new-po-tool` 스킬

## 구조

- `types.ts` `ToolDef` — 판단(스키마 · 프롬프트) · 계산(`compute`) · 표시(`render`)를 한 객체로
- `run.ts` `runTool` — 입력 문서 → `inputSchema` → 이전 결과 → `validate` → 바쁨 확인 → claude → 출력 검사 → `compute` → md 저장
- `<도구>/` — `index.ts`(ToolDef) · `compute.ts` · `<도구>.test.ts`. `index.ts`의 `TOOLS`에 한 줄 등록

## 선택 훅 (`ToolDef`)

- `sourceOptional: true` — 입력 문서 없이 실행 (VOC). 문서가 없으면 프롬프트에서 `SOURCE_HEADING` 블록이 빠진다
- `validate(input, prev)` — 문자열을 돌려주면 그 메시지가 `ChainError`로 나간다. claude 실행 전에 불린다
  - C-4 협상: 라운드별 입력 검사는 validate (1라운드는 내 답 없음, 다음 라운드는 내 답 필수)
- `runningLabel` · `continueLabel` — 실행 중 안내 · 이어 실행 버튼

## 규칙

- 계산(점수 · 합계 · 순위 · 차이)은 `compute`. AI 출력을 그대로 표시하지 않는다
- `run.ts` · `types.ts`는 공통 틀 — 도구 PR에서 바꾸지 않는다 (별도 이슈)
- 새 도구 테스트는 `<도구>/<도구>.test.ts`에만 (`run.test.ts`는 공통 틀)
