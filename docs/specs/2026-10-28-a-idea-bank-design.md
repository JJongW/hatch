# A. 아이디어 뱅크 설계 (2026-10-28) · 이슈 #3

아이디어를 적고, 모아 보고, 상세(문서 6칸 입구)로 들어가는 **로컬 앱**. 저장은 맥의 md 파일.

## 1. 실행 환경

- 맥에서 `npm run dev`. Next.js 서버가 맥에서 돌므로 파일을 직접 읽고 쓴다 (bridge 불필요)
- 데이터 폴더: `HATCH_DATA_DIR` (기본 `~/Hatch`). 없으면 만든다
- Vercel에서는 동작하지 않는다 → Vercel 연결은 **B(bridge)로 미룸** (작업 체계 spec §8 변경)

## 2. 화면

| 경로 | 내용 |
| --- | --- |
| 좌측 네비바 (레이아웃) | 로고 · 아이디어 쓰기 · 아이디어 모음 · 구분선 · PO 도구 4개(링크 없음, "준비 중") |
| `/` 쓰기 | 제목(한 줄, 필수) + 메모(여러 줄, 선택). 제목에서 Enter = 저장. 저장 후 입력 비움 · 아래 "방금 적은 아이디어" 최신 5개 |
| `/ideas` 모음 | 최신순 카드: 제목 · 메모 첫 줄 · 날짜 · 진행 배지. 클릭 → 상세. 비면 "아직 아이디어가 없어요" + 쓰기 링크 |
| `/ideas/[id]` 상세 | 위: 제목 · 메모 수정, 휴지통으로 이동. 아래: 문서 6칸 — 파일 있으면 내용(마크다운 원문), 없으면 "B 단계에서 생성" |

- 진행 배지: 문서 순서에서 **파일이 있는 마지막 단계** 이름 (없으면 "아이디어"). 코드가 계산
- 문서 6칸 순서: 기획안 `plan.md` → 커리큘럼 `curriculum.md` → PRD `prd.md` → 기능명세 `spec.md` → 개발 프롬프트 `dev-prompt.md` → 디자인 프롬프트 `design-prompt.md`
- 마크다운은 A에서 원문 그대로(`pre`) 보여 준다. 렌더링은 B에서

## 3. 저장 (`src/lib/storage/`, 서버 전용)

```
$HATCH_DATA_DIR/
├─ ideas/<id>/idea.md   머리말: id · title · createdAt · updatedAt · version(1) / 본문: 메모
├─ ideas/<id>/<문서>.md  (B에서 생성)
└─ .trash/<id>/          휴지통
```
- id: `YYYYMMDD-HHmm-xxxx` (xxxx = 소문자·숫자 4자 무작위). 폴더명에 한글 없음
- 함수 (모두 async):
  - `listIdeas(): { ideas: Idea[]; unreadable: number }` — 최신순(createdAt 내림차순)
  - `getIdea(id): Idea | null`
  - `createIdea({ title, memo }): Idea` — 제목 앞뒤 공백 제거, 비면 에러
  - `updateIdea(id, { title?, memo? }): Idea` — updatedAt 갱신
  - `trashIdea(id): void` — `.trash/`로 이동 (같은 id가 있으면 뒤에 `-1`, `-2`)
  - `getDocs(id): Doc[]` — 6칸 고정 순서, `{ key, label, file, content: string | null }`
  - `progressOf(docs): string` — 진행 배지 문구 (순수 함수)
- `Idea = { id, title, memo, createdAt, updatedAt }` (ISO 문자열)
- id는 `^\d{8}-\d{4}-[a-z0-9]{4}$`만 허용 (경로 조작 방지)
- 머리말 해석: `gray-matter`

## 4. 화면과 데이터 연결

- 페이지는 서버 컴포넌트에서 storage 함수 호출 → Montage를 쓰는 클라이언트 컴포넌트에 props로 전달
- 쓰기 · 수정 · 삭제는 Server Action (`src/app/actions.ts`) → storage 호출 → 경로 재검증
- storage는 화면에서 직접 import하지 않고 서버 컴포넌트 · Server Action에서만

## 5. 오류 처리

- 데이터 폴더 없음 → 생성
- 머리말이 깨진 파일 → 건너뛰고 모음 화면에 "읽지 못한 파일 n개"
- 없는 id 상세 → Next.js `notFound()`
- 저장 실패 / 빈 제목 → 화면에 한국어 한 줄

## 6. 테스트

- vitest. storage 함수를 임시 폴더(`HATCH_DATA_DIR` 지정)에서: 만들기 → 목록 → 읽기 → 수정 → 휴지통 → 목록에서 사라짐, 깨진 파일 건너뜀, 잘못된 id 거부, 진행 배지 계산
- 화면: 브라우저로 쓰기 → 모음 → 상세 → 수정 → 삭제 흐름
- 검증 명령에 `npm test` 추가

## 7. 범위 밖

문서 생성(B) · PO 도구(C) · 검색(신호: 아이디어 30개 넘으면) · 마크다운 렌더 · 모바일 전용 레이아웃(좁으면 네비바가 위로 접히는 정도만) · Vercel 연결
