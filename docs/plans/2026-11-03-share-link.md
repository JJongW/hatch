# 공유 링크 실행 계획

spec: [2026-11-03-hosted-po-design.md](../specs/2026-11-03-hosted-po-design.md) · 이슈 #117 · PR 1 `feat/117-share-view`(Vercel 쪽) → PR 2 `feat/117-share-button`(맥 쪽)

## 정한 것 (spec을 구현하며 구체화)
- 토큰은 맥이 만든다. 올리기 요청에 토큰 원문을 담아 보내고, Vercel은 SHA-256 해시만 저장한다
- 올리기 API는 `POST /api/publish` 하나. 본문 `{ op: 'put', token, ideaId, payload }` 또는 `{ op: 'delete', token }`. 헤더 `x-hatch-time`(ms) · `x-hatch-signature` = hex `HMAC-SHA256(HATCH_PUBLISH_TOKEN, 시각 + '.' + 본문 원문)`
- 다시 보내기 막기: 지운 줄은 내용만 비우고 해시와 `deleted_at`을 남긴다(묘비). 묘비가 있는 토큰에는 다시 못 올린다. 줄의 `published_at`보다 오래된 시각의 put은 거절한다. 판단은 SQL 함수 하나(`put_hatch_share`)에서 한 번에
- 공유 본문은 맥이 라벨까지 풀어서 보낸다. 공유 화면은 받은 글을 그리기만 한다 (`{ v: 1, title, memo, context[], docs[], questions[], decisions[] }`, 칸마다 길이 · 개수 한도)
- 공유 화면은 상세 화면을 재사용하지 않고 읽기 전용 컴포넌트를 따로 둔다 (상세는 Server Action과 버튼이 얽혀 있다)
- 네비와 데모 배너는 `data-share-page` 표식으로 숨긴다 (`FocusPage`와 같은 방식, 폭은 880px)
- CSP는 nonce를 쓰지 않는다: Cache Components의 정적 셸에는 nonce를 넣을 수 없다. 대신 `connect-src 'self'` · `img-src 'self' data:` · `form-action 'none'` · `frame-ancestors 'none'`으로 스크립트가 들어와도 밖으로 못 보내게 막는다. `script-src 'self' 'unsafe-inline'`. **갈아탈 신호:** 공유 화면이 정적 셸 없이 완전 동적이 되면 nonce + `strict-dynamic`
- 바깥 이미지는 `DocMarkdown`에 `images="hide"`를 넘겨 글자로 바꾼다 (기본은 지금처럼 그림)

## Task — PR 1 (Vercel 쪽)
- [ ] 1. `supabase/shares.sql`: 표 `hatch_shares` + RLS + `put_hatch_share` · `delete_hatch_share` 함수
- [ ] 2. `src/lib/share/`: `payload.ts`(zod) · `token.ts`(만들기 · 형식 · 해시) · `sign.ts`(서명 · 검증 · 5분) · `store.ts`(Supabase REST, fetch 주입) · `publish.ts`(요청 → 판단, 순수) + 테스트
- [ ] 3. `src/app/api/publish/route.ts` (POST) · `src/app/s/[token]/{page,loading,share-view}.tsx` · `next.config.ts` 헤더 · `app-shell` 표식 · `DocMarkdown images`
- [ ] 4. 검증 4개 · dev에서 가짜 저장소로 공유 화면 · 헤더(curl) · 콘솔 · `hatch-reviewer` · why · PR

## Task — PR 2 (맥 쪽)
- [ ] 5. 공유 본문 만들기(허용 목록) + 테스트 · `share.json` 저장
- [ ] 6. 상세 `공유` 버튼 → 확인 → 올리기 · 링크 복사 · 새로고침 · 끄기 · 새 링크 · 휴지통 이동 시 지우기
- [ ] 7. 맥 dev → 공유 → 다른 브라우저로 열기 → 끄기 → 다시 열기 · 검증 · 리뷰 · PR
