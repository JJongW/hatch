# 확인 질문 설계 (2026-10-29)

피드백 7 · [반영 계획](../plans/2026-10-29-feedback.md) 4b. 이슈 #47 (만들기 · 저장) · #48 (답 적기 → 결정).
문서마다 `[확인 필요: X]`가 남지만 지금은 요약 판에 `라벨 N곳`으로 셀 뿐이다. 누구에게 무엇을 물어야 하는지는 PO가 문서를 다시 읽고 정리해야 하고, 답을 얻어도 남길 자리가 없다.
목표: **`[확인 필요]`를 고객에게 물을 질문 · 담당자에게 확인할 항목으로 바꾸고**, 얻은 답을 **4a 결정으로 남겨** 다음 생성이 따른다.

## 1. 결정 (2026-10-29 사용자 확인)
- 분류 · 문장화는 **AI**(`claude -p`, JSON). 코드는 모으기 · 검사 · 답함 계산
- 답은 **결정으로** 남긴다 (4a 저장 · 폼 재사용). 질문지 복사 · 내보내기는 안 한다
- 새 PO 도구가 아니라 아이디어 상세 안의 연결로 만든다 (피드백 7 "새 도구보다 연결")
- PR 2개: ① 만들기 · 저장 ② 답 적기 → 결정 (각 400줄 / 15파일 안)

## 2. 모으기 (코드, PR ①)
`collectUnknowns(docs)` — 내용이 있는 문서 전부에서 `[확인 필요: X]`를 라벨로 묶는다 (`countUnknowns`와 같은 라벨 정규화 · `○○` 제외)
- 라벨마다: 등장 수, 예시 줄 최대 2개 `{ doc: 문서 이름, line: 그 줄(앞뒤 공백 정리, 200자 자름) }`
- 라벨 없는 `[확인 필요]`는 빼고 수만 센다 (`unnamed`). 하나로 묶으면 서로 다른 질문이 섞인다
- 많은 순 최대 **30개** (`QUESTION_LABEL_MAX`). 넘는 라벨은 이번 목록에서 빠진다 (수만 안내)

## 3. 만들기 (AI 판단 + 코드 검사, PR ①)
**입력** — 프롬프트(`src/lib/prompts/questions.ts`)에 라벨 목록(라벨 · 수 · 예시 줄) + 프로젝트 맥락 · 결정 블록(4a `projectBlock`). 아이디어 제목 · 메모 한 줄
**출력 스키마** (zod → `toClaudeSchema`)
```ts
type QuestionItem = {
  label: string;                       // 입력 라벨 그대로
  kind: 'customer' | 'owner';          // 고객에게 물을 것 / 담당자에게 확인할 것
  role: '기획' | '개발' | '디자인' | '데이터' | '법무' | '운영' | '';  // owner면 필수, customer면 ''
  question: string;                    // 한 문장 질문, 최대 200자 (결정 "정할 것" 한도와 같음)
};
```
**프롬프트 규칙**
- 고객 질문: 사용자 · 고객이 겪는 일 · 행동을 묻는 열린 질문. 답을 유도하지 않는다
- 담당자 질문: 예/아니오나 값으로 답할 수 있게. 내부 정책 · 기술 · 법 · 수치는 담당자
- 이미 정한 결정과 같은 주제면 "(정함: …) 이대로 가도 되나요?"처럼 확인형
- 라벨마다 정확히 하나

**코드 검사** (`validateQuestions(labels, raw)`)
- 입력에 없는 라벨 → 버림 · 같은 라벨 두 번 → 첫 번째만
- `kind` · `role`이 정해진 값이 아니면 그 항목 버림. customer의 role은 `''`로 고침. owner인데 role이 `''`면 `'기획'`
- question 앞뒤 공백 정리, 비었으면 버림, 200자 넘으면 버림
- 남은 항목이 입력 라벨을 하나라도 빠뜨리면 실패 → `ChainError('질문을 다 만들지 못했어요. 다시 눌러 주세요.')`
- 라벨이 0개면 claude를 부르지 않고 `ChainError('질문으로 만들 [확인 필요]가 없어요.')`

**실행** — Server Action `makeQuestionsAction(id)` → `makeQuestions(id)`. `runClaude`의 바쁨 잠금을 그대로 쓴다 (문서 생성 중이면 `BUSY_MESSAGE`). 1분쯤 걸리는 긴 Action이라 화면은 그동안 다른 저장 버튼을 막는다 (지금 문서 생성과 같은 규칙). 데모면 `DEMO_MESSAGE`

## 4. 저장 (PR ①)
`<id>/questions.md` 머리말 (본문 없음). 파일이 없거나 깨지면 "아직 안 만듦"
```ts
type QuestionSet = {
  version: 1;                // QUESTION_FILE_VERSION
  createdAt: string;         // ISO 8601
  labels: string[];          // 만들 때 넣은 라벨 (새 라벨 감지용)
  items: QuestionItem[];     // 깨진 항목은 읽을 때 건너뜀
};
// storage: getQuestions(id) · saveQuestions(id, set)
```
- 다시 만들 때 이전 판을 `.history/questions-<시각>.md`로 (`keepHistory`)
- "답함"은 저장하지 않는다 — 같은 질문 문장(공백 무시)의 결정이 있는지로 계산 (4a 결정 칸과 같은 규칙)

## 5. 화면 — "확인 질문" 칸 (요약 판과 문서 사이)
**아직 안 만듦** — `[확인 필요] N곳 · 라벨 M개` + "질문 목록 만들기". 라벨이 0개면 칸을 숨긴다
**만든 뒤**
- **고객에게 물을 것 (n)** — 줄마다 질문 + 작게 `라벨 · 3곳`
- **담당자에게 확인할 것 (n)** — 역할별 소제목(기획 · 개발 · 디자인 · 데이터 · 법무 · 운영 순) 아래 같은 줄 모양
- 문서에서 사라진 라벨의 질문은 숨긴다. 답한 질문은 목록에서 빠지고 칸 아래 "답한 것 N개" (PR ②)
- 지금 문서의 라벨 중 `labels`에 없는 것이 있으면 "새로 생긴 확인 필요 N개" + "다시 만들기"
- 빠진 것 안내 한 줄 (있을 때만): "라벨 없는 표시 N곳 · 31번째부터 M개는 빠졌어요."
- 만들기 실패는 칸 안 `SectionMessage`로
- 데모: 목록만 (만들기 · 다시 만들기 · 답 적기 없음). 데모에서 안 만든 아이디어는 칸을 숨긴다

**계산은 summary 쪽 순수 함수로** — `questionView(set, unknowns, decisions)` → `{ customer, owner: {role, items}[], answered, newLabels, hidden }`. 페이지가 계산해 props로 넘긴다

## 6. 답 적기 → 결정 (PR ②)
- 줄마다 "답 적기" → 그 줄 아래 4a `DecisionForm` (질문 고정 · 정함/보류 · 답 · 이유). 한 번에 폼 하나 (결정 칸과 같은 규칙)
- `Decision.from`에 `'question'` 추가. `saveDecisionAction`이 `'question'`을 받는다. 결정 칸은 from과 상관없이 전부 보여 준다 (지금 그대로)
- 저장하면 그 질문은 "답한 것 N개"로 빠지고 요약 판 "결정" 칸에 나온다. 다음 기획안 생성 · 도구 실행에 4a 블록으로 들어간다 (추가 작업 없음)
- 생성 · 만들기 중에는 폼 제출을 막는다

## 7. 데모 샘플 (PR ②)
`demo-data/ideas/20261028-1441-n9rp/questions.md` — 지금 문서의 라벨로 만든 결과를 넣는다 (로컬에서 한 번 만들어 복사. 지어낸 개인 · 회사 정보 없이). 하나는 데모 결정과 같은 질문이면 "답한 것 1개"가 보인다

## 8. 구조
```
src/lib/questions/  collect.ts (collectUnknowns) · validate.ts (validateQuestions) · make.ts (makeQuestions) · questions.test.ts
src/lib/prompts/    questions.ts (프롬프트 · 출력 스키마)
src/lib/storage/    questions.ts (+test) · types.ts (QuestionItem · QuestionSet · Decision.from에 'question')
src/lib/summary/    questions.ts (questionView, +test)
src/app/actions.ts  makeQuestionsAction
src/app/ideas/[id]/ questions-panel.tsx · idea-detail.tsx · page.tsx
```
`src/lib/summary/parse.ts`의 라벨 정규화를 `collect.ts`와 나눠 쓴다 (같은 규칙이 두 곳에 생기지 않게)

## 9. 테스트
- 모으기: 라벨별 수 · 예시 줄 2개까지 · 200자 자름 · 라벨 없는 것 제외하고 수만 · 30개 제한 · `○○` 제외
- 검사: 모르는 라벨 · 중복 · 잘못된 kind/role · customer role 고침 · 빈 질문 · 200자 초과 · 빠진 라벨이면 실패
- 만들기: 라벨 0개면 claude 안 부름 · 가짜 claude(`fake-claude.mjs`)로 저장까지 · 이전 판 `.history/`
- `questionView`: 사라진 라벨 숨김 · 새 라벨 감지 · 답함(공백 무시) · 역할 순서
- 화면(dev, 임시 데이터): 만들기 → 목록 · 답 적기 → 빠지고 결정 칸에 · 문서 수정 → "새로 생긴" · 데모에서 버튼 없음 · 콘솔 오류 없음

## 10. 이번에 안 하는 것
질문지 복사 · 내보내기 · 고객 답을 맥락 "이미 아는 사실"로 넣기 · 라벨 없는 `[확인 필요]` 처리 · 질문 직접 고치기 · 변경 비교 · 승인(4c)
