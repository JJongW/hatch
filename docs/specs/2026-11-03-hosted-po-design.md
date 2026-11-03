# PO는 맥에서, 다른 사람은 공유 사본으로: 공유 링크와 보안 (2026-11-03, #117)

## 0. 사용자 요구 (원문)
- "vercel 같은 아예 공유된 서비스에서 이걸 연결해서", "사용자는 무조건 PO만이 가능한거고 타인은 볼 수 있게는 해야한다"
- "코드나 모든 자료는 이미 mac서버에 있는거고 회사라고 한다면 회사 서버", "인터넷이 안되는 환경에서는 자료를 만질 수가 없는 거잖아", "보안은 ?", "우선 보안을 체크하고 해줘"

정한 것: 자료 원본은 PO 맥(`~/Hatch`)에 그대로 둔다. 다른 사람은 **아이디어별 공유 링크**로, PO가 올린 **읽기 전용 사본**만 본다 (방식 C).
버린 안: A(Supabase가 원본 — 자료 전부가 밖에 남고 오프라인에서 못 씀), B(터널로 맥 공개 — 맥이 인터넷에 열림).
`2026-10-28-b-doc-chain-design.md` §1(Tailscale만, Funnel 안 씀)은 그대로 지킨다.

## 1. 모양
```
[PO 기기] ─Tailscale(내 기기만)─▶ [PO 맥: Hatch + ~/Hatch 원본] ─claude -p─▶ Claude
                                         │ 공유 누를 때만, 밖으로 HTTPS POST (발행 토큰)
                                         ▼
[보는 사람] ─/s/<토큰>─▶ [Vercel: 공유 화면 + /api/publish] ──비밀 키──▶ Supabase hatch_shares
```
- PO 쪽은 지금과 같다. 로그인 없음, tailnet 기기만, 오프라인에서도 맥에서 읽고 고친다 (생성만 인터넷 필요)
- 맥은 **밖으로 보내기만** 한다. 받는 포트, 터널, Funnel 없음
- Vercel은 공유 화면 하나와 올리기 API 하나만 한다. 데모 `/try`는 그대로

## 2. 보안 점검 (2026-11-03, 지금 코드)
| 항목 | 지금 | 판단 |
| --- | --- | --- |
| PO 접속 범위 | Tailscale Serve, tailnet에 PO 기기 3대만 (`tailscale status`). Funnel 꺼짐 | 유지. 기기 하나를 잃으면 전부 열림 → §3-1 |
| Server Action 출처 | `serverActions.allowedOrigins`에 Serve 주소 하나, 와일드카드 안 씀 (`next.config.ts`) | 유지 |
| 경로 조작 | 아이디어 id는 `isValidId` 정규식 통과만 경로에 씀 | 유지. 공유 토큰도 같은 방식으로 형식 검사 |
| 문서 안 HTML · 스크립트 | `react-markdown` 기본값(원문 HTML 안 그림, `javascript:` 링크 제거). mermaid `securityLevel: 'strict'` | 유지 |
| 문서 안 바깥 이미지 | `react-markdown`이 `![](https://…)`를 그대로 그림 | **고침** — 공유 화면에서 열면 보는 사람 IP가 그 서버로 샘 → §3-4 |
| 생성 | `claude -p --tools ""` 도구 없음. 프롬프트 본문 로그 안 남김 | 유지. 문서에 지시문이 섞여도 맥에서 명령을 못 돌림 |
| 보안 헤더 | 없음 (CSP, Referrer-Policy, 프레임 막기) | **추가** — 공유 화면에 §3-4 |

## 3. 막는 방법
### 3-1. 맥 (원본)
- 인터넷에서 맥으로 들어오는 길을 만들지 않는다. 공유는 맥 → Vercel 한 방향 POST
- tailnet: 새 기기는 관리 화면에서 승인해야 들어오게(Device approval), 잃어버린 기기는 바로 제거. Tailscale 키 만료는 끄지 않는다
- 맥은 FileVault 켬. 회사 기기면 회사 정책 우선
### 3-2. 올리기 (`/api/publish`)
- 맥은 Supabase 키를 갖지 않는다. 갖는 건 `HATCH_PUBLISH_TOKEN` 하나 — 공유 사본을 올리고 지우는 것만 할 수 있다
- 요청마다 `HMAC-SHA256(발행 토큰, '시각.본문')` 서명, 시각이 5분 넘게 차이 나면 거절. 발행 토큰은 32자 이상
- 다시 보내기: 끈 토큰에는 묘비(해시 + 끈 시각)가 남아 다시 못 올린다. 저장된 판보다 오래된 시각의 요청도 거절. 맥 시계 기준이라 맥 시계가 앞서 있다가 고쳐지면 그 토큰은 잠시 못 올린다 → 맥 화면은 "새 링크"를 권한다
- Vercel이 받은 본문을 zod로 검사: 허용한 칸만, 문서 하나 200KB · 전체 1MB 넘으면 거절
- 토큰이 새면: Vercel env에서 바꾸고 재배포 → 옛 토큰 즉시 무효
### 3-3. 무엇을 올리나 (허용 목록)
- 올림: 제목, 메모, 맥락 칸, 생성 문서 본문(머리말 뺌), 확인 질문, 결정 · 보류 (질문에 단 답은 결정으로 들어 있다)
- **안 올림:** 이전 판(`.history`), 사용량, 생성 중 표시, PO 도구 결과, 휴지통, 다른 아이디어, 폴더 이름
- 올리기 전 PO에게 보여 주기: "이 아이디어의 문서 N개, 질문 N개, 결정 N개를 공유해요" → 확인 후 올림
- 다시 올리기는 PO가 `공유 새로고침`을 누를 때만. 맥에서 고쳐도 저절로 올라가지 않는다
### 3-4. 공유 화면 (`/s/<토큰>`)
- 토큰: 24바이트 난수(192비트) base64url. DB에는 **SHA-256 해시만** 저장 → DB가 새어도 링크를 못 만든다
- 형식이 틀린 토큰은 DB를 묻지 않고 바로 "공유가 끝난 링크예요." (없는 링크와 같은 답 → 있는지 알 수 없음)
- 읽기만: 버튼, 폼, Server Action 없음. 네비는 안 보임 (공용 틀이라 정적 링크는 HTML에 남는다, 데이터 없음)
- 헤더: `Referrer-Policy: no-referrer`(문서 안 링크를 눌러도 토큰이 바깥으로 안 샘) · `X-Robots-Tag: noindex, nofollow` · `Cache-Control: private, no-store`(공유를 끄면 바로 안 보이게) · `X-Content-Type-Options: nosniff` · `Content-Security-Policy`(`connect-src 'self'` · `img-src 'self' data:` · `form-action 'none'` · `frame-ancestors 'none'`, 글꼴만 jsdelivr). nonce는 Cache Components 정적 셸에 못 넣어 `script-src 'unsafe-inline'` — 들어온 스크립트도 fetch · 이미지로는 못 내보내지만 페이지 이동은 못 막는다
- 문서 안 이미지는 그리지 않고 "[이미지: 설명 (공유 화면에서는 숨김)]"으로
- 공유 화면에 `'use cache'` 쓰지 않음. 매번 DB에서 읽는다
### 3-5. 저장 (Supabase)
- 표 `hatch_shares(token_hash pk, idea_id, payload, published_at, deleted_at, updated_at)` 하나. RLS 켜고 정책 없음, anon · authenticated 권한도 걷음 → 비밀 키(Vercel 서버 env)만 읽고 쓴다. 쓰기는 `security definer` 함수 2개(`search_path ''`)로만. 브라우저는 Supabase에 직접 닿지 않는다
- 공유 끄기 · 새 링크 · 맥에서 휴지통 이동 → 그 줄의 **내용을 바로 지운다**. 해시와 끈 시각만 묘비로 남긴다 (같은 토큰 다시 올리기 막기). 원본은 맥에 있음
- 맥은 `~/Hatch/ideas/<id>/share.json`에 `{ createdAt, publishedAt }`만 남긴다. 토큰 원문은 PO 화면에 한 번 보여 주고 맥 파일에도 남긴다(다시 복사용). 해시만 밖에 있다
### 3-6. 남는 위험 (받아들임)
- 링크를 아는 사람은 누구나 본다. 링크를 다시 전달하는 것은 막을 수 없다 → 민감한 아이디어는 공유하지 않는다. 화면 위에 "링크가 있는 사람은 누구나 볼 수 있어요"
- Vercel, Supabase는 공유한 사본 내용을 볼 수 있다 (업체 저장 암호화는 됨)
- **갈아탈 신호:** 보는 사람을 정해야 한다(회사 사람만) → Vercel 앞에 이메일 확인(Vercel Authentication 또는 Cloudflare Access)

## 4. 만들 것 (PR 2개)
1. **Vercel 쪽:** `hatch_shares` 표(supabase/shares.sql) · `/api/publish`(올리기 · 지우기, 서명 검사) · `/s/[token]` 읽기 화면 + 헤더 · 바깥 이미지 숨김
2. **맥 쪽:** 상세 머리에 `공유` 버튼 → 확인 → 올리기 · 링크 복사 · `공유 새로고침 · 공유 끄기 · 새 링크` · 휴지통 이동 시 지우기. env `HATCH_PUBLISH_URL · HATCH_PUBLISH_TOKEN`
- 배포: 1 머지 → 사용자가 Vercel env(`HATCH_PUBLISH_TOKEN`, Supabase 키는 이미 있음) · 표 만들기 · 배포 → 2 머지 → 맥 `.env.local`에 같은 토큰

## 5. 테스트
- 서명: 틀린 서명, 5분 지난 시각, 같은 요청 다시 보내기, 큰 본문, 허용 밖 칸 → 모두 거절
- 허용 목록: 올리는 본문에 `.history`, 사용량, 도구 결과, 머리말이 없는지
- 토큰: 해시만 저장되는지, 형식 틀림 · 없음 · 끔이 같은 답인지
- 공유 화면: 헤더 5개, 버튼 · 폼 0개, 바깥 이미지 숨김, 끈 직후 다시 열면 안 보임
- 화면: 맥 dev → 공유 → 다른 브라우저(로그인 없음)로 링크 열기 → 끄기 → 다시 열기. 콘솔 확인

## 6. 범위 밖
PO가 Vercel에서 작업하기 · 보는 사람 로그인 · 댓글 · 공유 화면의 PO 도구 결과 · 자동 다시 올리기 · 휴대폰 화면 다듬기 · 다크 모드(#97)
