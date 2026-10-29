# 맥락 · 결정 기록 설계 (2026-10-29)

피드백 2 · 7 · [반영 계획](../plans/2026-10-29-feedback.md) 4a. 이슈 #43 (맥락) · #44 (결정).
지금 아이디어는 제목 · 메모뿐이라, 목표 고객 · 지표 · 제약을 문서와 도구마다 다시 설명해야 한다. 상세의 "지금 내려야 할 결정"은 AI가 기획안에 남긴 질문을 보여 줄 뿐, 사람이 정한 답 · 이유는 어디에도 남지 않고 다시 만들면 같은 질문이 또 나온다.
목표: **맥락을 한 번 적으면 모든 생성에 재사용**하고, **사람이 정한 것 · 보류한 것과 이유를 남겨** 다음 생성이 그걸 따른다.

## 1. 결정 (2026-10-29 사용자 확인)
- 결정은 **AI 질문에 답하기 + 직접 추가** 두 길. 도구 결과 화면의 "결정으로 남기기"는 이번에 안 한다 (VOC 우선순위도 직접 추가로 남긴다)
- 맥락 · 결정은 기획안 생성과 도구 실행에 들어간다. 비어 있으면 입력이 지금과 똑같다
- PR 2개: ① 맥락 ② 결정 (각 400줄 / 15파일 안)

## 2. 맥락 (PR ①)
**저장** — `idea.md` 머리말에 `context` 객체. `IDEA_FILE_VERSION` 2. 1판(칸 없음)은 빈 맥락으로 읽는다
```ts
type IdeaContext = { customer: string; goal: string; constraints: string; facts: string }; // 모두 '' 가능
// Idea에 context: IdeaContext 추가. 칸당 최대 1,000자 (넘으면 StorageError '맥락 칸은 1,000자까지예요.')
```
| 칸 | 화면 이름 | 안내 문구(placeholder) |
| --- | --- | --- |
| customer | 목표 고객 | 누구의 문제를 푸나요? |
| goal | 목표 지표 | 무엇이 움직이면 성공인가요? |
| constraints | 제약 | 일정 · 인력 · 정책처럼 넘으면 안 되는 선 |
| facts | 이미 아는 사실 | 조사 · 데이터로 확인한 것 |

**화면** — 상세 머리 아래 "프로젝트 맥락" 칸 (요약 판 위)
- 읽기: 채운 칸만 `이름: 값`. 전부 비면 "적어 두면 모든 문서와 도구에 같이 들어가요." + "맥락 적기" 버튼
- "수정"/"맥락 적기" → 그 자리에 4칸 폼 + 저장 · 취소. 저장은 Server Action `saveContextAction(id, form)` → `updateIdeaContext(id, ctx)`
- 데모: 읽기만 (버튼 없음)

## 3. 결정 (PR ②)
**저장** — `<id>/decisions.md` 머리말 `items` 배열 (본문 없음). 파일이 없으면 빈 목록. 쓰기 전 이전 판을 `.history/decisions-<시각>.md`로
```ts
type Decision = {
  id: string;                 // 4자 랜덤 (목록 안에서만 유일)
  question: string;           // 정할 것 (최대 200자)
  status: 'decided' | 'deferred';
  answer: string;             // decided면 필수, deferred면 '' (최대 500자)
  reason: string;             // 필수 (최대 500자) — 왜 이렇게 정했나 / 왜 미루나
  from: 'plan' | 'manual';    // 기획안 질문에 답함 / 직접 추가
  decidedAt: string;          // ISO 8601, 고칠 때 갱신
};
// storage: listDecisions(id) · saveDecision(id, input, decisionId?) · removeDecision(id, decisionId)
```
- 깨진 항목은 건너뛴다 (storage 규칙). 지우기는 목록에서 빼고 이전 판을 `.history/`에 남긴다

**화면** — 요약 판 "지금 내려야 할 결정" 칸을 바꾼다
- **아직 안 정한 것**: 기획안 `## 확인 필요` 항목(지금 `planDecisions`) 중 같은 질문(앞뒤 공백 무시)의 결정이 없는 것. 각 줄 오른쪽 "정하기" → 그 줄 아래 폼 (답 · 이유 · 정함/보류 선택). `from: 'plan'`
- **정한 것 · 보류한 것**: 저장된 결정. `질문 → 답` + 이유(작게) · 보류는 "보류" 표시. 각 줄 "수정" · "지우기"(확인 한 번)
- 칸 아래 "결정 직접 추가" → 질문 · 답 · 이유 · 상태 폼. `from: 'manual'`
- 칸 제목은 "결정". 데모에선 셋 다 비면 숨기고, 로컬에선 비어도 "정할 게 생기면 여기에 남겨요." + 직접 추가를 보인다. 아직 안 정한 것은 최대 5개 보이고 나머지는 "외 N개". 정한 것 · 보류한 것은 전부 보인다
- 데모: 목록만 (정하기 · 수정 · 지우기 · 추가 없음)
- 생성 중(`running`)에는 결정 · 맥락 폼의 제출을 막는다 (Server Action 하나씩 규칙)

## 4. 생성에 반영
**기획안** — `ideaSource(idea, decisions)`가 지금 문자열 뒤에 비어 있지 않은 블록만 붙인다
```
# 제목

메모

### 프로젝트 맥락
- 목표 고객: …

### 정한 것
- 질문 → 답 (이유: …)

### 보류한 것
- 질문 (보류 이유: …)
```
- 맥락 · 결정이 모두 비면 지금과 바이트까지 같다 → 기존 기획안이 stale이 되지 않는다 (테스트로 고정)
- 맥락 · 결정을 바꾸면 기획안 해시가 달라져 stale → 뒤 문서로 이어진다 (기존 stale 규칙 그대로). `getDocs`가 결정을 같이 읽는다
- 블록 제목 문자열은 `src/lib/prompts/context.ts`에 상수로

**도구** — 아이디어 문서로 실행할 때(`source`에 `ideaId`) 기획안과 같은 맥락 · 결정 블록(제목 · 메모 줄은 빼고)을 입력 문서 다음에 붙인다. 블록 문자열은 기획안과 한 함수에서 만든다. 붙여넣기 · 문서 없이는 붙이지 않는다

**규칙 한 줄** — `CHAIN_RULES` · `TOOL_RULES`에 "정한 것은 다시 묻지 말고 따른다. 보류한 것은 [확인 필요]로 남긴다." (`docs/ai-usage/prompts.md` §5에 기록)

## 5. 데모 샘플
`demo-data/ideas/20261028-1441-n9rp`에 맥락(목표 고객 · 목표 지표)과 결정 1개("첫 출시 지역을 어디로 할 것인가?" → 정함, 지어낸 개인 · 회사 정보 없이)를 넣는다. 기획안은 다시 만들지 않으므로 "앞 내용이 바뀜"으로 보인다 — 결정이 문서에 영향을 준다는 걸 보여 주는 상태로 둔다

## 6. 구조
```
src/lib/storage/   types.ts (IdeaContext · Decision · 버전 2) · ideas.ts (context 읽기/쓰기 · updateIdeaContext)
                   decisions.ts (+test) · docs.ts (ideaSource · getDocs)
src/lib/prompts/   context.ts (블록 제목 · 규칙 한 줄)
src/lib/tools/run.ts — ideaId 있으면 블록 추가
src/lib/summary/   SummaryInput에 decisions, Summary.decisions → { open: string[]; decided: Decision[]; openMore: number }
src/app/actions.ts — saveContextAction · saveDecisionAction · removeDecisionAction
src/app/ideas/[id]/ context-panel.tsx · decision-form.tsx · idea-summary.tsx (결정 칸)
```

## 7. 테스트
- storage: 1판 idea.md → 빈 맥락 · 1,000자 넘으면 오류 · 결정 저장/수정/지우기 · 깨진 항목 건너뜀 · 이전 판 `.history/`
- `ideaSource`: 맥락 · 결정 없으면 지금과 같음 · 블록 순서 · 빈 칸 생략
- `summarize`: 답한 질문은 open에서 빠짐 · 공백 차이 무시 · 직접 추가는 decided에만
- 화면(dev, 임시 데이터): 맥락 적기 → 기획안 stale 표시 · 정하기 → 줄이 정한 것으로 이동 · 수정 · 지우기 · 데모에서 버튼 없음 · 콘솔 오류 없음

## 8. 이번에 안 하는 것
도구 결과에서 결정 남기기 · `[확인 필요]` → 질문 목록(4b) · 변경 비교 · 승인(4c) · 결정 이력 화면 · 맥락을 체인 뒤 단계에 직접 넣기(기획안을 거쳐 퍼진다)
