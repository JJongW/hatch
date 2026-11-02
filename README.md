# Hatch 🐣

> 아이디어 한 줄을 적으면, 기획안 · PRD · 기능명세서를 거쳐 개발 · 디자인 프롬프트까지 부화시키는 PO용 아이디어 뱅크.

**데모 (읽기 전용)**: https://hatch-steel-alpha.vercel.app — 샘플 아이디어 · 6문서 · PO 도구 4종 결과를 둘러볼 수 있다. 생성은 내 컴퓨터에서 실행할 때만 된다 ([왜](docs/decisions/2026-10-28_읽기-전용-데모.md))

## 왜 만드나

PO의 일은 문서를 채우는 게 아니라 **풀 가치가 있는 문제를 고르고, 근거로 우선순위를 정하고, 팀이 같은 결정을 이해하게 하는 것**이다.
그런데 아이디어는 메모장에 쌓이기만 하고, 근거와 결정 이유는 채팅창과 머릿속에 흩어진다. 문서 하나를 고치면 다른 문서가 어긋나도 아무도 모른다.

Hatch는 이 일을 돕는다. 결정은 사람이 하고, AI는 정리 · 초안 · 반론 · 변경 추적을 맡는다.
- **아직 모르는 것을 숨기지 않는다** — AI가 지어내지 않고 `[확인 필요: …]`로 남긴다
- **반론을 먼저 듣는다** — 개발 · 디자인 · 마케팅 · CS 관점의 반론과, 고친 뒤 무엇이 나아졌는지
- **앞 문서가 바뀌면 알린다** — 이어진 문서가 낡았다는 표시

다음 단계: 맥락 · 결정 이유를 한 번 저장해 모든 작업에 재사용하고, `[확인 필요]`를 고객 질문으로 바꾸고, 문서 변경의 영향을 사람이 승인해 반영한다 ([계획](docs/plans/2026-10-29-feedback.md)).

## 흐름

```
아이디어 한 줄
  └─▶ 상세 기획안 ─▶ 개발 로드맵 ─▶ PRD ─▶ 기능명세서
                                                └─▶ 개발 프롬프트 / 디자인 프롬프트
```

각 단계는 앞 단계 결과를 입력으로 받는다. 버튼을 누르면 한 단계씩 만들고, 만든 문서는 고칠 수 있다. 생성은 내 컴퓨터의 **로컬 Claude Code**(`claude -p`)가 한다.

## 화면 구성

- **좌측 네비바**: 아이디어 작성 · 아이디어 모음 · PO 도구
- **아이디어 작성**: 한 줄(또는 몇 줄)만 적으면 저장
- **아이디어 모음**: 카드 목록. 클릭하면 해당 아이디어의 기획안으로 바로 이동
- **PO 도구**: 상단에서 기획안을 고르고 이어서 진행
  - PRD 리뷰 위원회 — 개발 · 디자인 · 마케팅 · CS 위원이 반론부터, 고친 판 재리뷰 전 → 후 점수
  - VOC 우선순위 도우미 — AI가 주제 · 심각도를 판단, 건수 · 점수는 코드가 계산
  - 지표 · 실험 설계 코치 — 핵심 · 보조 · 가드레일 지표, A/B 실험안, 표본 크기는 코드가 계산
  - 이해관계자 협상 연습 — 부딪히는 요청을 페르소나가 걸어 오고 조율을 채점
- **사용량**: 기능별 토큰, 시간, 정가 기준 비용과 효율 신호. 아이디어별 합계

## 진행 단계

| 단계 | 내용 | 비고 |
| --- | --- | --- |
| **A. 아이디어 뱅크** | 작성 · 모음 · 네비바 · 저장 | 나머지 전부의 바닥 |
| **B. 문서 생성 체인** | 아이디어 → 기획안 → 개발 로드맵 → PRD → 기능명세 → 프롬프트 | A의 데이터를 입력으로 |
| **C. PO 도구 4종** | 기획안 선택 + 도구 실행 | 공통 틀 하나 → 4개는 서브 작업으로 병렬 |
| **D. 디자인 시스템** | Montage 기본 + TDS 패턴 참고 | A부터 적용, 마지막에 다듬기 |

## 기술 스택

- **Next.js** (App Router) · 내 컴퓨터에서 실행 (macOS · Linux · Windows)
- **디자인**: [Montage](https://github.com/wanteddev/montage-web) (원티드 웹 디자인 시스템, MIT) 기본 컴포넌트 · 토큰.
  TDS(토스 디자인 시스템)는 화면 패턴 · UX 라이팅만 참고 (두 시스템의 토큰을 섞지 않는다)
- **저장**: 내 컴퓨터의 md 파일 (`~/Hatch/ideas/<id>/`)
- **생성**: 로컬 Claude Code (`claude -p`)

## 실행

준비물: macOS · Linux · Windows 중 하나 · Node.js 20.9 이상 · [Claude Code](https://claude.com/claude-code) 설치 후 `claude` 로그인 (터미널에서 `claude -p "안녕"`이 답하면 준비 끝)

Windows는 PowerShell에서 아래 명령을 그대로 쓴다. Claude Code는 공식 설치 스크립트로 깔면 `claude`를 바로 찾는다.
npm으로 깔아서 "claude를 찾을 수 없어요"가 뜨면 `.env.local`의 `HATCH_CLAUDE_BIN`에 실행 파일 경로를 넣는다 (`.js` · `.mjs` · `.cjs` 경로면 node로 실행한다).

```bash
git clone https://github.com/JJongW/hatch.git
cd hatch
cp .env.example .env.local
npm install
npm run dev
```

http://localhost:3000 에서 연다. 데이터는 홈 폴더의 `Hatch`(`~/Hatch`, Windows는 `C:\Users\<이름>\Hatch`)에 쌓인다 (`.env.local`의 `HATCH_DATA_DIR`로 바꿀 수 있다).

따라 하기 (약 10분):
1. **아이디어 쓰기**에 한 줄 적고 Enter → **아이디어 모음**에서 연다
2. 상세 화면에서 기획안 → 로드맵 → PRD … 순서로 "만들기" (단계마다 30초~1분 30초)
3. 좌측 **PO 도구 → PRD 리뷰 위원회** → 방금 만든 아이디어의 PRD로 실행 → PRD를 고치고 "고친 판 다시 리뷰"로 점수 전후 비교
4. Hatch 밖 문서는 "직접 붙여넣기" 탭으로

검증: `npm run lint && npm run typecheck && npm test && npm run build` (테스트는 가짜 claude로 돈다 — 로그인 없이도 통과)

## 문서
- 설계 · 계획: [`docs/specs`](docs/specs) · [`docs/plans`](docs/plans)
- 결정마다 왜: [`docs/decisions`](docs/decisions)
- **AI 활용 과정** (프롬프트 · CLAUDE.md · 스킬 · 토큰 관리 · AI 실수 수정): [`docs/ai-usage`](docs/ai-usage)

## 다른 기기에서 열기 (Tailscale Serve)

```
[휴대폰 · 다른 맥] ──▶ https://<내 맥>.<tailnet>.ts.net  (Tailscale Serve, 내 tailnet만)
                              │
                       [맥: Next 서버] ── claude -p · ~/Hatch
```

1. Tailscale 관리 화면에서 MagicDNS · HTTPS 인증서 · Serve를 켠다 (처음 한 번)
2. Hatch를 띄울 컴퓨터에서 `npm run build && npm start`
3. `tailscale serve --bg 3000` → 같은 tailnet 기기에서 `https://<내 맥>.<tailnet>.ts.net`
4. 따로 설정할 것은 없다 — Serve가 `x-forwarded-host`로 주소를 넘겨 Server Action 출처 검사를 통과한다 (2026-10-28 확인).
   `npm run dev`로 열었는데 버튼이 막히면 `.env.local`에 `HATCH_SERVE_HOST=<내 맥>.<tailnet>.ts.net`
5. 그만 열 때 `tailscale serve reset`

- 맥이 켜져 있어야 동작한다. 개인용이라 로그인은 없다 — **Funnel(인터넷 공개)은 쓰지 않는다**
- `bridge/`(별도 중계 서버)는 보류. Next 서버가 맥에서 `claude`를 직접 실행하므로 필요 없다

## 나중에 갈아탈 신호

- 맥이 꺼져 있어도 써야 하거나, 다른 사람도 써야 하거나, Vercel에 올려야 한다 → **작업 대기열**(Supabase / Upstash에 작업을 쌓고 맥 워커가 가져감). 이때 `bridge/`를 다시 꺼낸다
- 맥 말고 다른 곳에서도 같은 아이디어를 저장해야 한다 → md 파일 대신 DB
- PO 도구가 4개를 넘는다 → 도구 정의를 설정 파일 하나로 모으기

## 열린 질문

- 휴대폰 화면 배치 (지금은 좁으면 네비바가 위로 접히는 정도)

## 데모 배포 (Vercel)

```bash
vercel deploy --prod -e HATCH_DEMO=1 -e HATCH_DATA_DIR=demo-data -b HATCH_DEMO=1 -b HATCH_DATA_DIR=demo-data
```

`HATCH_DEMO=1`이면 저장 · 생성 · 도구 실행을 막고 상단에 안내를 띄운다. 데이터는 저장소의 `demo-data/`(실제 claude로 만든 샘플)를 읽는다.
