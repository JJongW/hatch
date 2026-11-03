# src/lib/storage/ — 아이디어 · 문서 저장 (A)

담당: `ui-builder` · 설계: [A spec §3](../../../docs/specs/2026-10-28-a-idea-bank-design.md)

## 파일 지도
- `index.ts` — 밖에서 import하는 유일한 입구
- `ideas.ts` — 아이디어 읽기 · 쓰기 (`server-only`) · `docs.ts` — 문서 저장 · 바뀐 원인 · 초안(적용 · 유지) · 이전 버전 · 생성 중 표시 · `paths.ts` — 경로 · `ids.ts` — id 생성 · 검사 · `progress.ts` — 진행 배지 · `tools.ts` — PO 도구 결과 저장 · 목록 · `decisions.ts` — 결정 · 보류 · 제안 기록 · `evidence.ts` — 확인한 근거 · `questions.ts` — 확인 질문 · `history.ts` — 덮어쓰기 전 이전 판 보관 · `folders.ts` — 폴더 묶음 계산 (순수) · `index-file.ts` — `목록.md` 자동 쓰기 · `usage.ts` — 사용량 장부 덧붙이기 · 읽기 · `types.ts`
- `*.test.ts` — vitest, 임시 폴더를 `HATCH_DATA_DIR`로

## 저장 형식
`$HATCH_DATA_DIR`(기본 `~/Hatch`)`/ideas/<id>/idea.md` (머리말 + 메모, 머리말 `context` = 맥락 4칸 · `folder` = 폴더 이름(빈 값 = 미분류) · 3판) · 생성 문서는 `<id>/docs/plan.md` 등 (예전 자리 `<id>/plan.md`도 읽음, 쓸 때 `docs/`로) · 삭제는 `.trash/`로 이동 · `$HATCH_DATA_DIR/목록.md` — 폴더별 아이디어 목록 (만들기 · 고치기 · 휴지통 때 다시 씀)
문서 머리말 `generatedAt · sourceHash · inputs(입력 조각별 해시) · editedAt · version`(inputs 없는 예전 문서는 원인 `unknown`, 머리말 없는 손글 문서는 stale 아님) · 다시 만든 판은 `<id>/drafts/<key>.md`(적용 · 유지하면 `.history/<key>-draft-<시각>.md`로, 안 지움) · 이전 판 `.history/<key>-<시각>.md` · 생성 중 표시 `<id>/.running.json`(10분 넘으면 무시)
결정 `<id>/decisions.md` (머리말 `items`, `status` = decided · deferred · proposed(제안, 기획안 입력에 안 넣음), `from` = plan · manual · question, `evidenceIds` 선택, 고치기 전 판은 `.history/decisions-<시각>.md`) · 근거 `<id>/evidence.md` (`items` = `{ text, source, sourceNote, question }`, 결정 수에 안 들어감, 기획안 입력 맨 뒤 "확인한 근거" 블록, `.history/evidence-<시각>.md`)
공유 상태 `<id>/share.json` (`{ token, createdAt, publishedAt }` · 끄면 `{ token: null, closedAt }`, 토큰 원문은 맥에만)
확인 질문 `<id>/questions.md` (머리말 `labels` · `items`, 다시 만들기 전 판은 `.history/questions-<시각>.md`)
도구 결과 `<id>/tools/<도구>-<시각>-<rand>.md` (붙여넣기는 `$HATCH_DATA_DIR/tools/`) · 머리말 `data` = 계산 결과 JSON
사용량 `$HATCH_DATA_DIR/usage.jsonl` (호출 한 번 = JSON 한 줄, `v: 1`, `turns` = 모델 호출 수 · `usage.iterations` 길이 (`num_turns` 아님), 프롬프트 내용은 남기지 않음, 쓰기 실패는 생성을 막지 않음)

## 규칙
- 함수 모양(인터페이스)은 유지. 나중에 DB로 옮겨도 호출부는 그대로
- id는 `isValidId` 통과한 것만 경로에 쓴다 (경로 조작 방지)
- 머리말 형식을 바꾸면 `IDEA_FILE_VERSION`을 올리고 읽을 때 변환
- 깨진 파일은 건너뛰고 개수만 알린다. 빈 저장소는 빈 값

## 갈아탈 신호
- 여러 기기에서 같은 데이터 필요 → DB(Supabase 등). 인터페이스는 유지

## 하지 말 것
- 화면 컴포넌트 import · 파일을 지우기 (휴지통 이동만) · 개인정보 · 키 저장
