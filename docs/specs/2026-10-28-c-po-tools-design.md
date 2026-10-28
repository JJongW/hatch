# C. PO 도구 4종 설계 (2026-10-28)

문서 하나를 골라 PO 도구로 검토 · 분석 · 연습한다. 도구 4종: PRD 리뷰 위원회 · VOC 우선순위 · 지표 · 실험 설계 · 이해관계자 협상.
원칙은 B와 같다 — **AI는 판단, 코드는 계산**. 실행은 B의 `src/lib/claude/run.ts`(한 번에 하나, 5분 제한)를 그대로 쓴다.

## 1. 결정 (2026-10-28 사용자 확인)
- 결과는 md로 저장해 다시 본다
- 입력 문서는 Hatch 아이디어의 문서 **또는 직접 붙여넣기** (회사 PRD 등 Hatch 밖 문서)
- 협상 연습은 **라운드 방식** (요청 → 내 답 → 채점 · 상대 반응 → 원하면 다음 라운드)
- VOC는 **텍스트 붙여넣기** (한 줄 = VOC 하나)

## 2. 구조
```
src/lib/tools/            types.ts (ToolDef) · run.ts (runTool) · index.ts (TOOLS 목록)
src/lib/tools/<도구>/     index.ts (ToolDef) · compute.ts (계산 순수 함수) · *.test.ts
src/lib/prompts/tools/    <도구>.ts (프롬프트 · 입력 블록 제목 상수)
src/lib/storage/          tools.ts (결과 저장 · 읽기) 추가
src/app/tools/            _frame/ (공통 틀 화면) · <도구>/page.tsx (입력 · 결과 영역)
```
- 도구 폴더명: `prd-review` · `voc` · `metrics` · `negotiation` (src/app/tools/CLAUDE.md와 같음)
- 화면 · Server Action은 `src/lib/tools`의 `index.ts`만 import (storage와 같은 규칙)

### 도구 정의
```ts
type ToolDef<In, Out, Res> = {
  key: ToolKey; label: string;
  accepts: DocKey[];                 // 받는 아이디어 문서. 첫 번째가 기본 (예: prd-review → ['prd', 'spec', 'plan'])
  inputSchema: z.ZodType<In>;        // 도구별 입력 칸 (VOC 줄 · 기준 전환율 · 내 답 등). 폼 값 검사
  outputSchema: z.ZodType<Out>;      // AI 출력. JSON Schema로 claude에 넘긴다
  prompt: string;                    // src/lib/prompts/tools/<도구>.ts 상수
  promptInput: (input: In, prev?: Res) => string; // 입력 칸을 프롬프트 블록으로 (제목은 prompts 상수)
  compute: (out: Out, input: In, prev?: Res) => Res; // 점수 · 합계 · 순위 · 전후 차이. 범위 밖 값은 자른다
  render: (res: Res) => string;      // md (코드가 만든다)
};
```

### 실행 `runTool({ tool, source, input, prevId? })`
1. 입력 문서 확정: `source` = `{ ideaId, docKey }` 면 그 문서 본문(머리말 제외), `{ pasted }` 면 붙여넣은 글. 비면 오류
2. `inputSchema`로 입력 검사 → 프롬프트 = `CHAIN_RULES` 같은 공통 규칙(`TOOL_RULES`) + 입력 문서 + `promptInput` + `prompt`
3. `runClaude` → `outputSchema` 검사 → `compute` → `render` → 저장
- `prevId`: 이전 결과를 이어 쓰는 도구용 (PRD 재리뷰 · 협상 다음 라운드). 저장된 `Res`를 읽어 `compute`에 `prev`로 준다
- 오류는 B의 `ChainError` 문구 그대로 + "입력 문서를 골라 주세요." · "입력 칸을 확인해 주세요."

## 3. 저장 (`src/lib/storage/tools.ts`)
- 아이디어 문서에서 실행: `ideas/<id>/tools/<도구>-<시각>-<rand>.md` · 붙여넣기: `$HATCH_DATA_DIR/tools/<도구>-<시각>-<rand>.md`
- 머리말: `tool` · `createdAt` · `source`(`<docKey>` 또는 `pasted`) · `sourceHash` · `prevId?` · `version: 1` · `data`(계산 결과 `Res` JSON — 재리뷰 · 다음 라운드가 읽는다)
- 본문: `render` 결과. 지우지 않는다. 협상 다음 라운드 · PRD 재리뷰는 **새 파일**(`prevId`로 연결)
- `saveToolResult(...)` · `listToolResults(tool, ideaId | null)` (최신순) · `getToolResult(id)`. 결과 id는 경로 조작 검사(`isValidId`와 같은 방식)

## 4. 화면 (`/tools/<도구>`)
| 영역 | 내용 |
| --- | --- |
| 입력 문서 | 탭: "아이디어 문서"(아이디어 선택 → `accepts` 중 있는 문서 선택, 기본 첫 번째) / "직접 붙여넣기"(TextArea) |
| 도구 입력 | 도구 페이지가 채운다 |
| 실행 | 버튼 + 진행 표시. 다른 생성 중이면 막는다 (`.running` 대신 `isClaudeBusy`, 3초 새로고침은 B와 같음) |
| 결과 | md 렌더 (`doc-markdown` 재사용) + 도구별 이어가기 버튼 (재리뷰 · 다음 라운드) |
| 지난 결과 | 같은 입력 출처의 결과 목록 → 누르면 결과 보기 |
- 네비바 `TOOLS`에 href를 붙이고, 완성된 도구만 "준비 중"을 뗀다
- 공통 틀은 `src/app/tools/_frame/` 하나. 도구 페이지는 입력 · 결과 영역만

## 5. 도구별

### PRD 리뷰 위원회 (`prd-review`, accepts: prd · spec · plan)
- AI: 위원 4명(개발 · 디자인 · 마케팅 · CS) 각각 **반론 먼저** `objections[{ issue, severity 1~3, suggestion }]` → 기준 5개 점수 1~5 `{ criterion, score, reason }`
- 기준: 명확성 · 실현 가능성 · 측정 가능성 · 사용자 가치 · 위험 대응 (코드 상수)
- 코드: 위원별 평균 · 전체 평균(소수 1자리) · 심각도별 반론 개수 · 반론 정렬(심각도 높은 순)
- 재리뷰: 결과 화면 "고친 판 다시 리뷰" → 문서(고친 아이디어 문서 또는 새로 붙여넣기)로 실행, `prev` = 이전 결과 → 기준별 · 위원별 **전 → 후 차이**를 코드가 계산해 표시

### VOC 우선순위 (`voc`, accepts: plan · prd — 맥락용, 없어도 됨)
- 입력: VOC 붙여넣기 (빈 줄 제외, 최대 200줄). 코드가 1부터 번호를 붙여 넣는다
- AI: 주제 3~8개 `topics[{ name, description }]` + 줄마다 `items[{ line, topic, severity 1~5 }]`
- 코드: 주제별 건수 · 평균 심각도 · 우선순위 점수 = 건수 × 평균 심각도 · 순위 · 주제별 대표 VOC 3개(심각도 순). 빠진 줄 · 없는 주제는 "분류 안 됨"으로 센다

### 지표 · 실험 설계 (`metrics`, accepts: prd · plan)
- 입력(선택): 기준 전환율(%) · 최소 감지 효과(상대 %) · 하루 실험 대상 수
- AI: 핵심 지표 1개 · 보조 2~4 · 가드레일 1~3 `{ name, definition, why }` + 실험안 1~2개 `{ hypothesis, variants[], primaryMetric }`
- 코드: 변형당 표본 크기 — 두 비율 비교, α 0.05(양측) · 검정력 0.8, p2 = p1 × (1 + 효과) · 필요 기간(일) = 표본 × 변형 수 ÷ 하루 대상 수 (올림). 입력이 없으면 계산하지 않고 `[확인 필요: 기준 전환율]` 등
- 테스트 기준값: p1 10% · 효과 10% → 변형당 14,751명 (올림)

### 이해관계자 협상 (`negotiation`, accepts: prd · plan)
- 1라운드 시작: AI가 페르소나 `{ role, goal, pressure }` + 요청 `request` (입력 문서와 부딪히는 요청)
- 내 답 제출: AI가 기준 5개 점수 1~5 `{ criterion, score, reason }` · 피드백 · 상대 반응 · 다음 요청
- 기준: 공감 · 근거 · 대안 제시 · 범위 지키기 · 명확성 (코드 상수)
- 코드: 라운드 합계(25점 만점) · 라운드 간 변화 · 세션 평균. 라운드마다 새 파일(`prevId`로 이전 라운드 연결), 이전 라운드 대화는 `prev`에서 프롬프트로
- 내 답 최대 2,000자

## 6. 오류 · 한도
- 붙여넣기 최대 30,000자 · VOC 200줄 · 협상 답 2,000자. 넘으면 "입력이 너무 길어요 (최대 ○○)."
- AI 점수가 범위 밖이면 자른다 (테스트 포함). 없는 위원 · 기준은 0이 아니라 "응답 없음"으로 표시하고 평균에서 뺀다

## 7. 테스트
- 도구마다: 입력 · 출력 스키마 정상/실패 · `compute` 경계값(범위 자르기 · 빈 값 · 전후 차이) · `render` 제목 칸
- `runTool`: 가짜 claude(`fake-claude.mjs`)로 저장 · `prevId` 연결 · 입력 없음 오류
- storage: 저장 경로(아이디어 · 붙여넣기) · 목록 최신순 · 잘못된 id 거절
- 실제 실행: 도구마다 실제 `claude`로 한 번 (C 각 이슈 끝에서)

## 8. 작업 나누기 (마일스톤 C)
| 이슈 | 내용 |
| --- | --- |
| C-1 | `src/lib/tools` · storage `tools.ts` · `TOOL_RULES` · 공통 틀 화면 · 네비바 링크 + **PRD 리뷰 위원회** (틀 검증용) · `new-po-tool` 스킬 경로 갱신 |
| C-2 | VOC 우선순위 |
| C-3 | 지표 · 실험 설계 |
| C-4 | 이해관계자 협상 |
- C-2~4는 C-1 머지 후 `tool-builder`로 병렬 (worktree, 각자 도구 폴더만)

## 9. 범위 밖
CSV 업로드 · 자유 대화형 협상 · 도구 결과를 체인 문서에 반영 · 결과끼리 비교 화면(재리뷰 전후 차이만 포함) · 결과 삭제
