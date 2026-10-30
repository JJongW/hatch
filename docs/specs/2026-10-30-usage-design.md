# 토큰 사용량 기록과 기능별 비교 설계 (2026-10-30)

이슈 #60. 사용자 요청: "각 기능에 드는 토큰이 어떻게 되는지, 효율적으로 관리가 되는지를 파악할 수 있으면 좋겠음."
`claude -p --output-format json` 결과에는 토큰, 정가 기준 비용, 모델이 이미 들어 있지만 실행기(`src/lib/claude/run.ts`)가 `structured_output`만 꺼내고 나머지를 버린다.

2026-10-30 전체 실제 테스트(호출 14번, 약 8분, 정가 기준 약 2.77달러)에서 본 숫자:
- 문서 7개 체인 약 1.23달러, PRD 리뷰 위원회 한 번 0.99달러 (전체의 36%)
- PRD 리뷰만 입력 글 4천 자에 캐시 쓰기 9.6만 토큰, 입력 토큰 4 (다른 호출은 2) → 모델이 두 번 돈 것으로 보임
- Hatch 실행 방식(빈 폴더, 프로젝트 설정만)의 기본 부담은 호출당 약 3천 토큰. 설정을 막지 않으면 약 27만

## 1. 결정 (2026-10-30 사용자 확인)
- 쓰임새는 **둘 다**: 기능끼리 비교해 무거운 곳을 줄이는 데, 아이디어 하나의 총비용을 보는 데
- 저장은 **사용량 장부 파일 하나** `$HATCH_DATA_DIR/usage.jsonl` (호출마다 한 줄 덧붙임). 실패와 다시 만들기까지 남아야 효율을 볼 수 있어서
- 화면은 네비바의 **사용량** 화면 하나 + 아이디어 상세에 합계 한 줄
- 데모에는 2026-10-30 실제 실행 숫자를 넣는다
- PR 두 개: ① 기록과 계산 ② 화면과 데모

## 2. 기록 한 줄

```ts
// src/lib/storage/types.ts
export type UsageFeature = 'doc' | 'questions' | 'tool';
export type UsageTag = { feature: UsageFeature; key: string; ideaId: string | null; again: boolean };
export type UsageEntry = UsageTag & {
  v: 1;
  at: string;            // ISO 8601, 호출이 끝난 시각
  ok: boolean;           // 결과를 받아 형식까지 통과했나
  ms: number;            // 걸린 시간
  turns: number | null;  // usage.iterations 길이 = 모델 호출 횟수. 1보다 크면 여러 번 돎
  input: number | null;  // usage.input_tokens
  cacheWrite: number | null;
  cacheRead: number | null;
  output: number | null;
  costUSD: number | null; // total_cost_usd (정가 기준 추정, 구독은 실제 청구 아님)
  model: string | null;   // modelUsage의 첫 키
  promptChars: number;    // 프롬프트 길이만. 내용은 남기지 않는다
};
```
- `key`: 문서는 `DocKey`, 확인 질문은 `questions`, 도구는 `ToolKey`
- `again`: 문서는 이미 있던 문서를 다시 만들 때, 확인 질문은 이미 질문 목록이 있을 때 true. 도구는 같은 문서로 다시 실행한 경우가 아니라 늘 false (도구는 다시 실행이 정상 사용이라 낭비 신호로 보지 않는다)
- claude가 결과 JSON을 못 낸 실패(시간 초과, 실행 실패)는 토큰 칸이 모두 null, `ok: false`
- 결과 JSON은 받았지만 `is_error`이거나 형식이 안 맞으면 토큰은 남기고 `ok: false`

## 3. 기록하는 곳

- **실행기 한 곳에서만 쓴다.** `runClaude({ prompt, jsonSchema, tag })` — `tag`는 필수 인자라 새 기능을 붙여도 기록을 빠뜨릴 수 없다
- 성공, 실패 모두 `finally`에서 한 줄. 장부 쓰기가 실패해도 생성은 막지 않는다 (`console.error`만, `목록.md`와 같은 원칙)
- 형식 검사(`schema.safeParse`)는 호출하는 쪽에 있다. 실행기가 `ok: true`로 적은 뒤 호출하는 쪽이 형식 오류를 내면 그 줄은 `ok: true`로 남는다. 이번에는 이 차이를 받아들인다 (형식 오류는 드물고, 토큰은 실제로 쓴 것이라 비용 계산에는 맞다). 형식 오류가 잦아지면 호출하는 쪽에서 `ok`를 고치는 길을 연다
- 호출하는 곳 세 군데: `chain/generate.ts`(문서), `questions/make.ts`(확인 질문), `tools/run.ts`(도구)
- 저장 함수: `src/lib/storage/usage.ts`의 `appendUsage(entry)`, `listUsage()`. 깨진 줄은 건너뛰고 개수만 알린다 (저장 규칙과 같음)

## 4. 계산 (코드, 순수 함수)

`src/lib/usage/summary.ts` — 화면은 이 결과만 받는다.
- **전체**: 호출 수, 총 토큰(입력 + 캐시 쓰기 + 캐시 읽기 + 출력), 총 비용, 기간
- **기능별**: 횟수, 평균 시간, 평균 총 토큰, 평균 출력 토큰, 평균 비용, 전체 비용 중 비중, 실패 수, 다시 만들기 수
- **아이디어별**: 호출 수, 총 토큰, 총 비용, 마지막 사용 시각
- **효율 신호** (기준은 코드 상수, 숫자를 바꾸기 쉽게 한 곳에):
  - `heavy` 비용 큼: 전체 비용 중 비중 30% 이상
  - `loops` 여러 번 돎: `turns > 1`인 호출이 하나라도 있음 (몇 번인지 같이)
  - `redo` 다시 만들기 잦음: 그 기능 호출 2번 이상이고 `again` 비율 50% 이상
  - `fails` 실패 있음: 실패 1번 이상
- "입력 대비 출력이 적음" 신호는 넣지 않는다. 실제 숫자(VOC 0.19, PRD 리뷰 0.11)로는 기준을 정할 근거가 없다

## 5. 화면 (PR ②)

- 네비바 맨 아래 **사용량** (`/usage`). PO 도구 묶음과 나눈다
- 위: 전체 합계 카드 + "비용은 정가 기준 추정이에요. 구독으로 쓰면 실제로 청구되지 않아요."
- 기능별 표: 비용 비중이 큰 순. 신호는 배지(비용 큼, 여러 번 돎, 다시 만들기 잦음, 실패 있음)
- 아이디어별 표: 비용 큰 순, 제목을 누르면 상세로
- `?idea=<id>`로 들어오면 그 아이디어 호출만 계산
- 아이디어 상세 요약 판 아래 한 줄: "이 아이디어에 쓴 토큰 약 N만, 정가 기준 약 X달러 (호출 M번)" → `/usage?idea=<id>`. 기록이 없으면 줄을 숨긴다
- 장부가 비면 "아직 기록이 없어요. 문서를 만들면 여기에 쌓여요."
- 스켈레톤은 `ListSkeleton`을 쓴다

## 6. 데모 (PR ②)
- `demo-data/usage.jsonl`에 2026-10-30 실제 실행 14줄. `ideaId`는 데모 아이디어 n9rp로 맞춘다 (실제 실행은 지어낸 다른 아이디어로 했다는 걸 why 기록에 적는다)

## 7. PRD 리뷰 두 번 돎 (PR ① 첫 작업)
- 원 결과 JSON을 남기도록 한 번 다시 돌려 `num_turns`와 이유를 확인한다
- 2026-10-30 확인: `num_turns`는 `--json-schema` 호출이면 결과 도구 호출 때문에 늘 2다 (작은 호출로도 2). 실제 모델 호출 횟수는 `usage.iterations` 길이라 `turns`를 그 값으로 남긴다. 다시 돌린 PRD 리뷰는 iterations 1, 캐시 쓰기 3.4만, 0.35달러로 이전(입력 4, 9.6만, 0.99달러)과 달랐다 → 가끔 생기는 재시도로 보고 새 이슈에 적는다
- 고치는 건 이 이슈에 넣지 않는다. 원인을 적은 새 이슈를 만든다

## 8. 테스트
- `usage.ts`: 덧붙이기, 읽기, 깨진 줄 건너뛰기, 빈 장부
- `summary.ts`: 기능별, 아이디어별 합계와 평균, 신호 네 가지의 경계값, `?idea` 거르기
- `run.ts`: 가짜 claude(`fake-claude.mjs`)가 `usage`(`iterations` 포함), `total_cost_usd`를 돌려주게 하고 성공, `is_error`, 시간 초과 때 장부 한 줄씩
- 호출하는 세 곳이 `tag`를 넘기는지 (기존 테스트에 장부 확인 추가)
- 실제 claude로 한 번: 문서 하나 만들고 장부 줄 확인

## 9. 하지 않는 것
- 사용량 상한, 경고 알림 (A 방식으로 갈 때 다시)
- 그래프 (표와 배지로 충분, 숫자가 쌓이면 다시)
- 장부 정리, 회전 (한 줄 약 300바이트, 하루 100번이면 1년에 약 11MB). 1MB를 넘으면 읽기 속도를 보고 월별로 나눈다
