# 아이디어 상세 재구성 설계 (2026-10-29)

피드백 4 · [반영 계획](../plans/2026-10-29-feedback.md) 2단계. 이슈 #39.
상세 화면이 "수정 입력창 + 문서 6장 나열"이라 저장된 프로젝트의 현재 상태와 다음 행동이 묻힌다.
목표: 열자마자 **무엇을 풀려는지 · 무엇을 알고 모르는지 · 무엇을 정해야 하는지 · 다음에 뭘 할지**가 보인다.

## 1. 결정 (2026-10-29 사용자 확인)
- 요약은 **코드로 뽑는다** (A안). AI를 부르지 않는다 → 즉시 · 무료 · 데모에서도 보이고, 같은 문서면 같은 요약
- 문서는 **탭**으로 하나씩 연다. 문서 안쪽 스크롤을 없애 페이지 스크롤 하나로
- "지금 내려야 할 결정"은 기획안의 `## 확인 필요` 절을 쓴다. 사람이 고른 결정이 아니라 AI가 남긴 질문이다 → 4a(결정 기록)에서 교체

## 2. 화면 (위 → 아래)
1. **머리** — 제목 · 메모를 읽기로 보여 준다. 오른쪽 "수정"을 누르면 그 자리에 기존 입력 폼(`IdeaForm`) + "휴지통으로"가 열리고, 저장 · 취소로 닫힌다. 데모에선 "수정" 버튼이 없다
2. **요약 판** — 네 칸 (3절). 화면 폭이 넓으면 2열, 좁으면 1열
3. **문서 탭** — 6개 탭. 탭 이름 옆 상태: 있음 · 아직 없음 · 앞 문서가 바뀜 · 만드는 중
   - 처음 여는 탭 = 추천 다음 행동이 가리키는 문서, 없으면 내용이 있는 마지막 문서, 그것도 없으면 기획안
   - 탭 안은 지금의 `DocCard` 내용(만들기 · 편집 · 다시 만들기 · 생성 중)을 그대로. 본문 `maxHeight` 스크롤은 뺀다
   - 선택 탭은 URL에 남기지 않는다 (YAGNI)

## 3. 요약 판 — 재료와 규칙
`summarize(input) → Summary` 순수 함수 하나. 입력은 이미 페이지가 읽는 값만.

```ts
type SummaryInput = {
  idea: { title: string; memo: string };
  docs: Doc[];                       // getDocs 결과 (content · stale)
  running: DocKey | null;
  voc: { total: number; top: string } | null;   // 이 아이디어의 최신 VOC 결과 (없으면 null)
  reviewedPrd: boolean;              // 이 아이디어 PRD로 돌린 PRD 리뷰가 있나
};
type Summary = {
  problem: { text: string; from: 'plan' | 'memo' | 'title' };
  evidence: { voc: { total: number; top: string } | null };
  unknowns: { label: string; count: number }[];  // 많은 순 → 처음 나온 문서 순, 최대 5개 보이고 나머지는 "외 N개"
  unknownTotal: number;                          // 묶은 뒤 종류 수
  decisions: string[];                           // 최대 5개
  next: NextAction;
};
type NextAction =
  | { kind: 'wait'; doc: DocKey }
  | { kind: 'check-stale'; doc: DocKey }
  | { kind: 'make-doc'; doc: DocKey }
  | { kind: 'make-questions' }
  | { kind: 'collect-voc' }
  | { kind: 'review-prd' }
  | { kind: 'done' };
```

| 칸 | 재료 | 없을 때 |
| --- | --- | --- |
| 해결하려는 문제 | 기획안 `## 문제` 절 첫 문단. `[확인 필요: …]`는 그대로 둔다 | 메모 첫 문단 → 그것도 없으면 제목 |
| 확인된 근거 · 모르는 것 | 근거: VOC 최신 결과 "고객 의견 N줄 · 1위 ○○". 모르는 것: 모든 문서의 `[확인 필요: X]`를 X(공백 정리)로 묶어 개수 | 근거 없음 → "아직 고객 근거가 없어요". 모르는 것 0 → 칸에서 줄 생략 |
| 지금 내려야 할 결정 | 기획안 `## 확인 필요` 절의 `- ` 항목. 끝의 `[확인 필요: …]` 꼬리표는 떼고 보여 준다 | 칸을 숨긴다 |
| 추천 다음 행동 | 아래 규칙의 첫 번째 | — |

**다음 행동 규칙** (위에서부터 첫 번째 하나)
1. `running` 있음 → `wait` ("○○ 만드는 중이에요")
2. 내용 있고 `stale`인 문서 중 가장 앞 → `check-stale` ("앞 문서가 바뀐 ○○ 확인") → 그 탭을 연다
3. 기획안 없음 → `make-doc: plan`
3-1. 질문 목록 여부를 넘겼고(`questionsMade === false`) 모르는 것 ≥ 1 → `make-questions` → 확인 질문 탭을 연다. 지금은 흐름 체험(/try)만 넘긴다 — 과제 순서가 질문 → 고객 의견이라서 (#113)
4. VOC 없음 + 모르는 것 ≥ 1 → `collect-voc` → `/tools/voc?idea=<id>`
5. PRD 있음 + PRD 리뷰 없음 → `review-prd` → `/tools/prd-review?idea=<id>`
6. 내용 없는 첫 문서 → `make-doc` → 그 탭을 연다
7. 전부 있음 → `done` ("문서가 모두 있어요. 바뀐 게 생기면 여기서 알려 줘요")

`make-doc`은 탭을 열어 주는 버튼이다(생성 버튼은 탭 안). 데모에선 탭 안이 "내 환경에서 사용하기"라 그대로 이어진다.

**파싱 규칙** (테스트로 고정)
- 절: `## 제목` 줄부터 다음 `## ` 줄 전까지. 제목은 앞뒤 공백 무시하고 정확히 일치
- `[확인 필요: X]` · `[확인 필요]`(이름 없음 → "이름 없음"으로 묶음) 모두. 닫는 `]` 없으면 무시 (코드 블록 강조와 같은 규칙 → `tbd.ts` 정규식 재사용)
- 라벨이 `○○`인 자리는 세지 않는다 — 프롬프트 문서가 "`[확인 필요: ○○]`로 표시된 정책은…"처럼 형식을 설명할 때 쓰는 자리라서
- 리뷰 여부: 이 아이디어의 `prd-review` 결과 중 `source = 'prd'`가 하나라도 있으면 true

## 4. 구조
```
src/lib/summary/       index.ts (summarize · 타입) · parse.ts (절 · 확인 필요 추출) · *.test.ts
src/app/ideas/[id]/    page.tsx — VOC · PRD 리뷰 결과를 더 읽고 summarize 결과를 넘긴다
                       idea-detail.tsx — 머리(읽기/수정) · 요약 판 · 탭 배치
                       idea-summary.tsx (요약 판) · doc-tabs.tsx (탭 + 상태) · doc-card.tsx (탭 안 내용만)
```
- `src/lib/summary`는 storage 타입만 import (화면 import 금지). `tbd.ts`는 `src/lib/`로 옮겨 code-block과 summary가 같이 쓴다
- VOC 결과 해석: 결과 `data`의 `total` · `topics[0].name`. 모양이 다르면 `null`(근거 없음)로 — 깨진 결과로 화면이 죽지 않게
- Montage: `Tab` · `TabList` · `TabPanel`, 요약 칸은 `Box` + 토큰

## 5. 오류 · 빈 상태
- 문서 0개(아이디어만): 문제 = 메모/제목, 근거 없음, 결정 칸 숨김, 다음 행동 = 기획안 만들기
- 결과 파일 읽기 실패: 근거 · 리뷰 여부만 없는 것으로 보고 나머지는 그린다

## 6. 테스트
- `summarize`: 다음 행동 규칙 8개 각각 · 문제 대체 순서 · 모르는 것 묶기/정렬/○○ 제외 · 결정 꼬리표 떼기 · VOC 깨진 data
- 화면: 데모 · 일반 모드로 샘플 3개(문서 6개 · 기획안만 · 아이디어만) 열어 보고 콘솔 확인

## 7. 이번에 안 하는 것
결정 · 보류 이유 저장(4a) · `[확인 필요]` → 질문 목록(4b) · 변경 비교 · 승인(4c) · 문서를 순서 없이 만들기 · 탭 URL 저장
