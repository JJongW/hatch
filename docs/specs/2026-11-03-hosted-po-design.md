# Vercel에서 PO가 직접 쓰기: 저장, 맥 워커, PO 로그인, 공유 링크 (2026-11-03, #117)

## 0. 사용자 요구 (원문)
- "vercel 같은 아예 공유된 서비스에서 이걸 연결해서 하게끔", "orca나 실제 CLI를 다루게 하는 것(중간 게이트)와 Vercel을 이어서"
- "사용자는 무조건 PO만이 가능한거고 타인은 볼 수 있게는 해야한다", "지금은 오로지 데모로서만 보는게 가능하고 PO조차도 vercel에서 동작이 안되는 상태"

정한 것 (사용자 선택): 다른 사람은 **아이디어별 공유 링크**로만 읽는다 / `~/Hatch` 데이터는 **한 번 옮긴다**.
이 문서는 `2026-10-28-b-doc-chain-design.md` §1의 "bridge 보류"를 푼다. 갈아탈 신호(Vercel 배포, 다른 사람도 봄)가 왔다.

## 1. 모양 — Orca 릴레이와 같은 방식
```
[PO 브라우저] ──로그인──▶ Vercel (Hatch) ──▶ Supabase ◀── 밖으로만 연결 ── [PO 맥: 워커] ── claude -p
[다른 사람] ──/s/<공유 토큰>──▶ Vercel (읽기 전용)   (hatch_files · hatch_jobs)
```
- 맥은 포트를 열지 않는다. 워커가 Supabase에 요청만 보낸다 (Orca 릴레이와 같다. Tailscale · Funnel 필요 없음)
- 생성은 PO 한 사람의 요청을 PO 맥에서 PO 계정으로 돌린다. 지금 로컬 사용과 같다
- 읽기는 Supabase에서 바로 한다. **맥이 꺼져 있어도 공유 링크는 열린다.** 맥은 생성할 때만 켜져 있으면 된다

| 모드 | 저장 | 생성 | 쓰는 곳 |
| --- | --- | --- | --- |
| 로컬 (지금 그대로, 기본) | `~/Hatch` 파일 | 직접 `claude -p` | 맥 `npm run dev`, Tailscale |
| 호스팅 (새로) | Supabase `hatch_files` | `hatch_jobs` → 맥 워커 | Vercel |
| 데모 | 예시 파일 | 안 함 | `/try` (호스팅에서도 남김) |

env 두 개로 고른다: `HATCH_STORE=file|supabase`(기본 file) · `HATCH_RUNNER=local|queue`(기본 local). `HATCH_DEMO=1`은 지금 뜻 그대로.

## 2. 저장 — md 파일을 그대로 표 한 줄로
- `src/lib/storage` 안의 `fs` 호출(10개 파일, 약 90곳)을 `storage/fs.ts` 하나로 모은다. 같은 함수 모양(`readFile · writeFile · appendFile · readdir · stat · mkdir · rename · rm · copyFile`)에 구현 두 개: 로컬 파일 / Supabase
- Supabase 표 `hatch_files(path text primary key, content text not null, updated_at timestamptz)`. `path`는 `HATCH_DATA_DIR` 기준 상대 경로(`ideas/<id>/docs/plan.md`)
  - `readdir`는 `path like '<dir>/%'`에서 바로 아래 이름만 계산. `mkdir`은 할 일 없음. `rename`은 앞부분이 같은 줄을 모두 바꿈 (휴지통 이동)
  - 머리말 형식, 파싱, stale, 이전 판 보관은 **하나도 안 바뀐다.** 저장 함수의 밖 모양도 그대로 (storage CLAUDE.md 규칙)
- 왜 정식 표가 아닌가: 형식이 이미 md 머리말로 정해져 있고 테스트가 그 위에 있다. 바꾸는 곳이 한 파일로 줄고, 옮기기와 되돌리기가 파일 올리기 · 내려받기뿐이다
  - **갈아탈 신호:** 아이디어 검색 · 집계를 DB에서 해야 하거나, 한 화면 읽기가 표 요청 20번을 넘으면 → 아이디어 · 문서를 정식 열로 나눈다
- `try/load.ts`(데모 예시)는 지금처럼 레포 안 파일을 읽는다. 바꾸지 않는다
- 표는 RLS 켜고 정책 없음 → 비밀 키(서버 · 워커)만 읽고 쓴다. 브라우저는 Supabase에 직접 닿지 않는다
- 옮기기: `npm run migrate:supabase` — `~/Hatch` 아래 파일을 모두 올린다. 이미 있는 path는 건너뛰고 개수를 알린다. `.trash/`도 올린다 (지우지 않음 규칙)

## 3. 생성 — 작업 대기열과 맥 워커
- 표 `hatch_jobs(id uuid, status queued|running|done|failed, prompt text, json_schema jsonb, timeout_ms int, result jsonb, error text, worker text, created_at, claimed_at, finished_at)`
- 가져가기는 함수 `claim_hatch_job(worker)` 하나: `for update skip locked`로 가장 오래된 queued 한 줄을 running으로 바꿔 돌려준다 (두 워커가 같은 작업을 잡지 않게)
- `runClaude`를 둘로 나눈다. 밖 모양(인자, 반환, `ChainError`, 사용량 장부)은 그대로
  - 실행부: 지금의 `claude -p` 띄우기. `local`이면 Vercel 대신 이 자리에서 바로, `queue`면 워커가 이걸 부른다
  - `queue` 구현: 작업을 넣고 2초마다 상태를 본다. done → `structured_output` 반환, failed → 그 오류를 `ChainError`로
  - 30초 안에 아무도 안 가져가면 작업을 failed로 바꾸고 "맥 워커가 꺼져 있어요. 맥에서 `npm run worker`를 켜 주세요."
  - 전체 280초를 넘으면 실패 (Vercel 함수 300초 안). 지금 생성은 20~50초 (2026-11-03 실측: 기획안 22초, PRD 리뷰 48초)
- 워커: `npm run worker` (맥에서, `.env.local`의 `SUPABASE_URL · SUPABASE_SECRET_KEY`). 2초마다 `claim_hatch_job` → 실행부 → 결과 쓰기. 한 번에 하나
  - 끝나면 `prompt`를 지운다 (아이디어 내용이 DB에 오래 남지 않게). 결과는 Vercel이 읽은 뒤 7일 지나면 지워도 된다 (지우기는 이번 범위 밖)
  - 로그에 프롬프트 본문을 남기지 않는다 (지금 규칙 그대로)
- 사용량 장부(`usage.jsonl`)는 지금처럼 `runClaude` 쪽에서 쓴다 → 호스팅에서는 `hatch_files`의 `usage.jsonl`. `appendFile`은 줄 하나를 덧붙이는 함수(`append_hatch_file`)로
- 생성 중 표시(`.running.json`)는 지금 그대로 파일 어댑터를 탄다
- **갈아탈 신호:** 2초 확인이 무료 한도를 압박하거나 기다림이 답답하면 → Supabase Realtime 구독. 워커가 2대 이상 → `worker`별 상태 화면

## 4. PO 로그인 — 한 사람만
- `HATCH_RUNNER=queue` 또는 `HATCH_STORE=supabase`면 로그인이 켜진다. 로컬 기본 모드는 지금처럼 로그인 없음
- `/login`: 비밀번호 한 칸. 값은 env `HATCH_OWNER_PASSWORD`, 비교는 상수 시간
- 맞으면 쿠키 `hatch_session` (httpOnly, Secure, SameSite=Lax, 30일) = `만료시각.HMAC(HATCH_SESSION_SECRET)`. 계정 표 없음
- 막기: 모든 Server Action(쓰기, 생성, 공유)은 맨 앞에서 `requireOwner()`. 페이지는 PO가 아니면 `/try`로 보낸다 (`/s/*`, `/try`, `/login`, `/survey` 제외)
- 5번 틀리면 15분 잠금 (IP 기준, 메모리 대신 `hatch_files`의 작은 파일 하나)
- 왜 Supabase Auth가 아닌가: 사람이 한 명이라 가입, 메일 설정이 필요 없다. **갈아탈 신호:** PO가 2명 이상 → Supabase Auth (메일 링크)

## 5. 공유 링크 — 아이디어별, 읽기만
- 상세 머리에 `공유` 버튼 (PO만): 누르면 `ideas/<id>/share.json`에 `{ token, createdAt }`을 만들고 주소 `/s/<token>`을 복사. 다시 누르면 `공유 끄기 · 새 링크`
  - token은 `crypto.randomBytes(24)` base64url. 머리말이 아니라 따로 파일 → `IDEA_FILE_VERSION`을 안 올린다
- `/s/<token>`: token으로 아이디어를 찾는다 (`share-index.json` 한 파일에 token → id). 없거나 끈 링크면 "공유가 끝난 링크예요."
- 화면은 지금 아이디어 상세를 읽기 전용으로: 문서, 확인 질문(답 보기만), 결정, 문제와 근거. 만들기 · 수정 · 맥락 · 답 적기 버튼은 숨긴다 (지금 데모 모드가 버튼을 숨기는 방식 재사용)
  - 네비는 보이지 않는다 (아이디어 모음 · 도구 · 사용량은 PO 전용). `noindex`
  - PO 도구 결과(PRD 리뷰 등)는 이번에 포함하지 않는다 → 갈아탈 신호: 공유받은 사람이 리뷰 결과도 봐야 한다고 하면
- 공유한 아이디어를 휴지통에 넣으면 링크도 끈다

## 6. 배포 순서 (안전)
1. 저장 어댑터 (PR 1) → 2. 대기열 + 워커 (PR 2) → 3. PO 로그인 (PR 3) → 4. 공유 링크 (PR 4)
- **Vercel은 3이 머지될 때까지 지금 데모 그대로.** 1, 2만 켜면 로그인 없이 쓰기가 열린다
- 3까지 머지 → 옮기기 → Vercel env (`HATCH_STORE=supabase · HATCH_RUNNER=queue · HATCH_OWNER_PASSWORD · HATCH_SESSION_SECRET`, `HATCH_DEMO` 끄기) → 배포. env와 배포는 사용자가 한다
- 되돌리기: Vercel env를 `HATCH_DEMO=1`로 되돌리고 재배포. 데이터는 `hatch_files`에 남는다

## 7. 테스트
- 저장 테스트를 두 어댑터로 돈다. Supabase 쪽은 가짜 REST(메모리)로 — 실제 Supabase는 테스트에서 쓰지 않는다
- 대기열: 가짜 표로 넣기 → 가져가기 → 끝 / 30초 아무도 안 가져감 / 실패 전달 / 280초 초과
- 워커: `fake-claude.mjs`로 한 바퀴. 끝난 뒤 `prompt`가 비었는지
- 로그인: 틀린 비밀번호, 만료 쿠키, 위조 쿠키, 잠금. 모든 Server Action이 `requireOwner`를 부르는지 (목록 검사 테스트)
- 공유: 끈 링크, 없는 token, 휴지통 이동 뒤 링크, 읽기 화면에 쓰기 버튼 0개
- 화면: 로컬 dev에서 `HATCH_STORE=supabase`(테스트용 Supabase 프로젝트) + 워커로 아이디어 → 기획안 → 공유 링크를 다른 브라우저로 열기. 콘솔 확인

## 8. 범위 밖
PO 2명 이상 · 보는 사람 로그인 · 댓글 · 실시간 진행 글자 · 워커 여러 대 · 오래된 작업 지우기 · 공유 화면의 PO 도구 결과 · 휴대폰 화면 다듬기 · 다크 모드(#97)

## 9. 확인 필요
- Supabase 무료 한도: 2초 확인 × 생성 50초 = 작업 하나에 25번 요청. 하루 생성 100번이어도 2,500번이라 넉넉할 것으로 본다. PR 2에서 실제 수를 잰다
- 워커가 맥에 비밀 키를 들고 있다. PO 맥이라 받아들인다. 갈아탈 신호: 다른 사람 맥에 워커를 둔다 → 워커 전용 키(작업 표만 쓰는 함수)로
