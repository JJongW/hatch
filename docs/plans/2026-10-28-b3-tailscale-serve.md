# B-3 Tailscale Serve 접속 + 문서 정리 (이슈 #7)

설계: [B spec §1 · §8](../specs/2026-10-28-b-doc-chain-design.md). 코드 변경은 설정 한 곳, 나머지는 문서.

## 확인한 것
- Next 16 Server Action은 `Origin` 호스트를 `x-forwarded-host` 또는 `host`와 비교한다. 다르면 거절한다 (docs: next-config-js/serverActions)
- 프록시가 공개 호스트를 넘기면 설정이 필요 없다. 아니면 `serverActions.allowedOrigins`에 주소창 호스트를 넣는다
- dev 서버를 다른 호스트로 열면 `allowedDevOrigins`도 필요하다
- 2026-10-28: 이 tailnet은 Serve가 꺼져 있다 (`Serve is not enabled on your tailnet`). 관리 화면에서 켜야 한다 (사용자 작업)

## Task
- [x] 1. `next.config.ts`: `HATCH_SERVE_HOST`가 있으면 `allowedDevOrigins`와 `experimental.serverActions.allowedOrigins`에 그 호스트 하나만 넣는다. 와일드카드(`*.ts.net`)는 다른 tailnet 사이트도 허용하게 되므로 쓰지 않는다
- [x] 2. `.env.example`: `HATCH_SERVE_HOST` · `HATCH_CLAUDE_BIN` · `HATCH_CLAUDE_MODEL` 설명
- [x] 3. README: 흐름(개발 로드맵) · 실행 · 다른 기기 접속(Tailscale Serve) · bridge 보류 · 열린 질문 정리
- [x] 4. 보류 표시: `bridge/CLAUDE.md` · `bridge-engineer` · 루트 CLAUDE.md 지금 단계 · Vercel 미리보기 머지 조건 → 로컬 화면 확인
- [ ] 5. 실제 확인 (Serve 켠 뒤): `npm run build && npm start` → `tailscale serve --bg 3000` → 휴대폰(또는 맥 브라우저)에서 `https://<맥>.<tailnet>.ts.net` → 아이디어 저장 · 문서 생성 1회. 실패하면 `HATCH_SERVE_HOST` 설정 후 재시도. 끝나면 `tailscale serve reset`
- [ ] 6. 검증 명령 · `hatch-reviewer` · PR
