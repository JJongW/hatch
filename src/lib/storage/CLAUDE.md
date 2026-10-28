# src/lib/storage/ — 아이디어 · 문서 저장 (A)

담당: `ui-builder` · 설계: [A spec §3](../../../docs/specs/2026-10-28-a-idea-bank-design.md)

## 파일 지도
- `index.ts` — 밖에서 import하는 유일한 입구
- `ideas.ts` — 파일 읽기 · 쓰기 (`server-only`) · `ids.ts` — id 생성 · 검사 · `progress.ts` — 진행 배지 · `types.ts`
- `*.test.ts` — vitest, 임시 폴더를 `HATCH_DATA_DIR`로

## 저장 형식
`$HATCH_DATA_DIR`(기본 `~/Hatch`)`/ideas/<id>/idea.md` (머리말 + 메모) · 같은 폴더에 문서 `plan.md` 등 · 삭제는 `.trash/`로 이동

## 규칙
- 함수 모양(인터페이스)은 유지. B에서 bridge로 옮겨도 호출부는 그대로
- id는 `isValidId` 통과한 것만 경로에 쓴다 (경로 조작 방지)
- 머리말 형식을 바꾸면 `IDEA_FILE_VERSION`을 올리고 읽을 때 변환
- 깨진 파일은 건너뛰고 개수만 알린다. 빈 저장소는 빈 값

## 갈아탈 신호
- 여러 기기에서 같은 데이터 필요 → DB(Supabase 등). 인터페이스는 유지

## 하지 말 것
- 화면 컴포넌트 import · 파일을 지우기 (휴지통 이동만) · 개인정보 · 키 저장
