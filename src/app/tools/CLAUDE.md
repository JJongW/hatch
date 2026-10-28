# src/app/tools/ — PO 도구 (C)

담당: `tool-builder` (도구 하나씩, worktree별 병렬) · 추가 절차: `new-po-tool` 스킬

## 도구 4종 (폴더명)
- `prd-review/` PRD 리뷰 위원회 · `voc/` VOC 우선순위 · `metrics/` 지표 · 실험 설계 · `negotiation/` 이해관계자 협상

## 공통 틀 (완성됨 — 도구는 이 틀만 씀)
- `_frame/load.ts` `loadToolPage(key, searchParams)` — 서버 전용. 아이디어 · 결과 목록 · 현재 결과를 읽어 `ToolFrameData`로
- `_frame/tool-frame.tsx` `ToolFrame` — 입력 문서 고르기 → 도구 입력 → 실행 → 결과 · 지난 결과. 도구별 입력 칸은 `inputFields`로 넘긴다
- `actions.ts` `runToolAction(key, …)` — 프레임 칸(`mode` · `ideaId` · `docKey` · `pasted` · `prevId`) 밖의 폼 필드는 전부 도구 입력
- 도구 정의(`ToolDef`) · 계산 · 렌더는 `src/lib/tools/<도구>/`. 실행 순서는 `src/lib/tools/run.ts`
- 페이지는 `prd-review/page.tsx` 모양 그대로 (`instant = false` · `connection()` → `loadToolPage` → `<ToolFrame run={runToolAction.bind(null, key)} />`)
- 점수 · 합계 · 순위 · 전후 차이는 `compute`가 계산 (AI는 판단만)

## 규칙
- 도구 하나 = `src/app/tools/<도구>/` + `src/lib/tools/<도구>/`. 다른 도구 폴더 수정 금지 (병렬 충돌 방지)
- 공유 파일은 한 줄만: `src/lib/tools/index.ts`의 `TOOLS` 등록 · `side-nav.tsx`의 `ready: true`
- 공통 틀(`_frame/` · `run.ts` · `types.ts`)을 바꿔야 하면 도구 PR에 섞지 말고 별도 이슈
- 문서 없이 실행 · 라운드별 입력 검사 등 도구별 차이는 `ToolDef` 훅으로 (`src/lib/tools/CLAUDE.md`)
- 프롬프트는 `src/lib/prompts/tools/<도구>.ts`

## 하지 말 것
- 도구 안에서 체인(`src/lib/chain`) 단계 수정
- AI 출력의 합계 · 평균을 그대로 표시
