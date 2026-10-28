---
name: new-po-tool
description: Hatch에 PO 도구(PRD 리뷰 위원회 / VOC 우선순위 / 지표·실험 설계 / 이해관계자 협상) 하나를 공통 틀 위에 추가할 때 쓰는 절차.
---

# PO 도구 하나 추가하기

## 전제
- 공통 틀은 `main`에 있다 (`src/app/tools/_frame/` · `src/lib/tools/`). 패턴 파일: `src/lib/tools/prd-review/` · `src/app/tools/prd-review/page.tsx`
- 이 도구의 이슈(`area:tools`)와 브랜치 `feat/<n>-<도구>`가 있다

## 순서
1. **판단 vs 계산 나누기** — AI가 판단할 것(분류 · 반론 · 제안)과 코드가 계산할 것(점수 · 합계 · 순위 · 전후 차이)을 표로 적는다
2. **계산 함수 + 테스트 먼저** — `src/lib/tools/<도구>/compute.ts`. 출력 타입 · 계산 · `render`(결과 md). 범위 밖 점수 자르기 포함
3. **`ToolDef`** — `src/lib/tools/<도구>/index.ts`. `outputSchema`(zod)와 `inputSchema`
4. **프롬프트** — `src/lib/prompts/tools/<도구>.ts`. 공통 규칙은 `context.ts`의 `TOOL_RULES`가 자동으로 앞에 붙는다
5. **등록 · fake-claude** — `src/lib/tools/index.ts`의 `TOOLS`에 한 줄. `src/lib/claude/fake-claude.mjs`에 `FAKE_CLAUDE=<도구>` 모드를 더해 `run` 테스트. 테스트는 `src/lib/tools/<도구>/<도구>.test.ts`에만 둔다 (`run.test.ts`는 공통 틀). 예시: `prd-review.test.ts`의 `runTool + FAKE_CLAUDE` 블록
6. **화면** — `src/app/tools/<도구>/page.tsx`. prd-review 페이지를 복사하고 도구별 입력은 `inputFields`로 (`montage-ui` 스킬)
   - `page.tsx`는 서버 컴포넌트다. 상태가 있는 입력 칸(onChange · 글자 수)은 `src/app/tools/<도구>/inputs.tsx`(`'use client'`)로 뺀다
   - 복사한 뒤 `'prd-review'` 리터럴 두 곳(`loadToolPage` · `bind`)을 바꾼다
7. **네비바** — `side-nav.tsx`의 해당 도구 `ready: true` (한 줄)
8. **검증** — `npm run lint && npm run typecheck && npm test && npm run build`, 실제로 기획안 하나 골라 실행 → `hatch-reviewer` → PR

## 배운 것
- `inputSchema`의 모든 제약에 한국어 메시지를 단다. zod 기본 메시지는 영어고 사용자에게 그대로 보인다
- 도구 입력은 `name`이 있는 평범한 폼 필드를 `inputFields`로 렌더한다. 프레임이 `new FormData(form, submitter)`로 직접 보내므로(`<form action>` 아님) 실행 뒤에도 입력이 남는다

- `ToolDef` 훅: 문서 없이도 되는 도구는 `sourceOptional: true` (VOC — 프레임에 '문서 없이' 선택이 생기고 프롬프트에서 문서 블록이 빠진다). C-4 협상: 라운드별 입력 검사는 validate — `validate(input, prev)`가 문자열을 돌려주면 claude 실행 전에 그 메시지로 거절한다. 라운드마다 다른 출력은 한 `outputSchema`에 선택 칸으로 두고 `compute`에서 나눈다. 이어 실행 뒤에도 입력 칸이 남으니 비워야 하면 도구 쪽에서 처리한다
- 실행 중 안내는 `runningLabel`로 (기본 '실행 중이에요 (1~2분)')

## 하지 말 것
- 공통 틀 · 다른 도구 폴더 수정 (필요하면 별도 이슈)
- AI가 낸 합계 · 순위 표시
