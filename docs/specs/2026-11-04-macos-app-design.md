# Hatch macOS 앱 (2026-11-04)

사용자 요청(2026-11-04): 터미널 없이 설치하고 실행하는 **진짜 맥 앱**. 다양한 사람이 `.dmg`를 받아 설치만 하면 쓰게 한다.
마일스톤 **E**. PR 7개로 나눈다 (§7). GitHub CI(Actions)는 쓰지 않는다. 빌드, 서명, 공증, 출시는 모두 종원의 맥에서 스크립트로 돌린다. 웹 버전(`npm run dev`)과 Vercel 데모는 그대로 둔다.

## 0. 정한 것
| 질문 | 답 |
| --- | --- |
| 왜 | 터미널 없이 설치, 실행, 맥 앱다운 경험, 누구나 설치만 하면 씀 |
| 생성 | 지금처럼 그 맥의 Claude Code(`claude -p`). 앱이 설치, 로그인을 검사하고 안내한다. API 키 방식은 넣지 않는다 ([로컬 Claude 결정](../decisions/2026-10-28_로컬-claude-생성.md) 유지) |
| 서명 | 사용자에게 Apple Developer 계정이 있다. Developer ID 서명 + 공증 |
| 방식 | **Swift 겉 + 지금 Hatch 화면.** SwiftUI, AppKit 앱이 번들 안의 Next 서버를 띄우고 WKWebView로 보여 준다 |
| v1 맥 기능 | 메뉴, 단축키, 생성 끝 알림, 메뉴 막대 아이콘, 자동 업데이트(Sparkle) |
| 지원 | macOS 14 Sonoma 이상, Apple Silicon, Intel (Node universal) |

버린 방식: Electron(200MB 넘고 덜 맥스러움), SwiftUI 전면 재작성(저장, 체인, 도구 4종, 공유를 다시 써야 하고 웹과 두 벌).
웹 화면을 SwiftUI로 옮기는 신호: 사용자가 "웹 같다"고 불편을 말한 화면이 생기면 그 화면 하나씩.

## 1. 구조
```
Hatch.app/Contents
├─ MacOS/Hatch            Swift 겉 (SwiftUI + AppKit)
│   창(WKWebView), 메뉴, 메뉴 막대, 알림, 첫 실행, 설정, Sparkle
└─ Resources/
    ├─ node               Node 실행 파일 (arm64 + x64 lipo). E6부터, E2는 시스템 node
    └─ hatch/             next build의 standalone 결과 (server.js, .next/static, public)
```
- 실행: 앱이 빈 포트를 고른다 → `node hatch/server.js`를 `HOSTNAME=127.0.0.1 PORT=<포트>`로 띄운다 → `/api/app/status`가 답하면 창에 띄운다
- 창을 닫아도 서버는 메뉴 막대와 함께 산다. ⌘Q면 서버에 SIGTERM, 3초 뒤 SIGKILL
- 데이터: 지금처럼 `~/Hatch` md 파일. 웹 버전과 같은 폴더라 쓰던 데이터가 그대로 보인다. 저장 형식은 바꾸지 않는다
- 서버는 `127.0.0.1`에만 연다. 같은 와이파이의 다른 기기는 못 들어온다
- Next 쪽 변경: `next.config.ts`에 `HATCH_STANDALONE=1`일 때만 `output: 'standalone'`. 웹과 Vercel 빌드는 설정이 그대로 (E1에서 데모 배포로 확인)
- 코드 위치: `macos/` Swift 패키지(`HatchCore`, `Hatch`, 테스트) + `scripts/build.sh`가 `.app`을 묶는다. Xcode 프로젝트 파일 없음. `macos/CLAUDE.md` 30줄 이하

### 1-1. 서버에 넘기는 환경 변수
| 변수 | 값 |
| --- | --- |
| `HATCH_DATA_DIR` | 설정의 데이터 폴더 (기본 `~/Hatch`) |
| `HATCH_CLAUDE_BIN` | 앱이 찾은 claude 경로 (§2-2) |
| `HATCH_APP_TOKEN` | 앱을 켤 때마다 새로 만드는 32바이트 난수. `/api/app/*`만 이 값을 본다 |
| `HATCH_PUBLISH_URL`, `HATCH_PUBLISH_TOKEN` | 공유를 켠 경우만 (§2-3). 토큰은 키체인에서 읽는다 |
| `HATCH_SERVE_HOST` | 다른 기기에서 열기를 켠 경우만 (§2-4) |

`.env.local`은 앱에서 쓰지 않는다. `HATCH_DEMO`는 넘기지 않는다 (설문, 데모 모드는 웹 데모 전용).

## 2. 첫 실행, 설정

### 2-1. 첫 실행 (네이티브 창 하나, 3단계)
1. **반가워요** — Hatch가 하는 일 한 줄. 데이터 폴더(기본 `~/Hatch`) + `바꾸기`
2. **Claude Code 확인** — §2-2로 `claude`를 찾고 `claude --version`
   - 못 찾음: 공식 설치 명령 한 줄 + `복사`, `터미널 열기`. 앱에 다시 들어오면 스스로 다시 찾는다
   - 찾았지만 로그인 전: `터미널에서 로그인하기`(터미널을 열고 `claude` 실행) → `다시 확인`(짧은 테스트 요청 하나, 토큰 아주 조금)
   - 한계: Claude Code 설치, 로그인 첫 한 번은 터미널을 거친다. Hatch는 터미널이 필요 없다
3. **준비 끝** — `첫 아이디어 쓰기` → 메인 창

끝낸 단계는 UserDefaults에 남겨 다음 실행에선 건너뛴다. 나중에 Claude를 못 찾으면 메뉴 막대 `!` → 같은 확인 화면.

### 2-2. claude 찾기
앱은 터미널의 PATH를 모른다. 이 순서로 찾고 처음 실행되는 것을 쓴다: 설정에서 고른 경로 → `~/.local/bin/claude` → `~/.claude/local/claude` → `/opt/homebrew/bin/claude` → `/usr/local/bin/claude` → 로그인 셸(`zsh -lc 'command -v claude'`)이 알려 준 경로.
`.js` 경로면 번들 Node로 실행한다 (run.ts 기존 규칙). 설정에 `직접 고르기`가 있다.

### 2-3. 공유 링크
발행 토큰을 앱에 넣어 배포하면 누구나 꺼내 종원의 Vercel, Supabase에 올릴 수 있다. 그래서:
- 기본은 **꺼짐**. 공유 버튼은 비활성 + "공유는 설정에서 켜야 해요"
- `설정 → 공유`에 발행 주소와 토큰을 넣으면 켜진다. 토큰은 키체인, 주소는 UserDefaults
- 웹 쪽: `HATCH_PUBLISH_*`가 없을 때 이미 공유를 막는지 E1에서 확인하고, 없으면 그 문구만 더한다

### 2-4. 다른 기기에서 열기 (Tailscale)
포트가 실행마다 바뀌면 Tailscale Serve가 이을 곳이 없다.
- `설정 → 다른 기기에서 열기`를 켜면 포트를 고정(기본 3000)하고 `tailscale serve --bg 3000`을 `복사` 버튼과 함께 보여 준다. Tailscale 주소(`*.ts.net`)를 넣는 칸 → `HATCH_SERVE_HOST`
- 고정 포트를 다른 프로그램이 쓰고 있으면 이유를 보여 주고 빈 포트로 켠다
- 앱이 `tailscale`을 직접 실행하는 건 v1에 넣지 않는다. 신호: 이 기능을 쓰는 사람이 생긴다

### 2-5. 설정 저장
데이터 폴더, claude 경로, 포트, 공유 주소, Tailscale 주소는 UserDefaults, 비밀값(발행 토큰)은 키체인. 바꾸면 서버를 다시 켠다 ("설정을 적용하려면 다시 시작해요" 확인).

## 3. 메뉴, 메뉴 막대, 알림

### 3-1. 메뉴와 단축키
| 메뉴 | 항목 |
| --- | --- |
| Hatch | Hatch에 대하여, 업데이트 확인…, 설정… (⌘ 쉼표), 끝내기 ⌘Q |
| 파일 | 새 아이디어 ⌘N (`/`로 이동), 빠른 아이디어 ⌥⌘N, 데이터 폴더 열기 |
| 편집 | 맥 기본 (실행 취소, 잘라내기, 복사, 붙여넣기, 모두 선택) |
| 보기 | 새로고침 ⌘R, 크게 ⌘+, 작게 ⌘-, 원래 크기 ⌘0 |
| 이동 | 뒤로 ⌘[, 앞으로 ⌘], 아이디어 모음 ⌘1, PO 도구 ⌘2, 사용량 ⌘3 |
| 도움말 | 사용 안내(GitHub README), 로그 보기, Claude Code 다시 확인 |

앱 서버(`127.0.0.1:<포트>`) 밖으로 가는 링크(GitHub, 공유 링크 `/s/…`의 Vercel 주소)는 기본 브라우저로 연다.

### 3-2. 앱 전용 주소 (Next, E1)
`HATCH_APP_TOKEN`이 없으면 404. 요청 머리 `x-hatch-app-token`이 다르면 401 (상수 시간 비교).
- `GET /api/app/status` → `{ ok: true, claudeBusy, running: [{ id, ideaId, title, doing, startedAt }], finished: [{ id, ideaId, title, body, ok, path, at }] }`
  - `running`은 서버 메모리의 생성 중 작업이다 (`.running.json`을 읽지 않는다). 알림 제목(`title`)과 본문(`body`)은 서버가 만들고, Swift는 그대로 보여 준다
  - `finished`는 서버 메모리의 최근 20개 (생성, 도구 실행이 끝날 때 한 줄 넣는다). 서버를 다시 켜면 비어도 된다. `path`는 알림을 누르면 열 화면
- `POST /api/app/ideas` `{ text }` → storage의 아이디어 저장 함수 그대로 → `{ ok, id, path }`. 첫 줄은 제목, 나머지는 메모, 2,000자까지. 빈 글, 너무 긴 글은 400, 본문이 16KB를 넘으면 413

### 3-3. 알림
- 앱이 맨 앞이 아닐 때 끝난 작업마다 알림: "PT 예약 앱, PRD를 만들었어요" / 실패 "PRD를 만들지 못했어요. (이유)". 누르면 그 `path`를 연다
- Swift는 `running`이 있을 때만 2초마다, 없으면 30초마다 `status`를 묻는다. 본 `finished.id`는 기억해 두 번 알리지 않는다
- 알림 권한은 첫 생성이 끝날 때 묻는다 (첫 실행에 몰아 묻지 않는다)

### 3-4. 메뉴 막대
- 아이콘: hatch_ic 흑백 템플릿 이미지. 상태: 준비됨(아이콘만), 만드는 중(점이 천천히 깜빡임, 동작 줄이기 설정이면 고정 점), 확인 필요(`!`)
- 메뉴: 지금 상태("PRD 만드는 중, 40초"), Hatch 열기, 빠른 아이디어…, 설정…, 끝내기
- 빠른 아이디어: 작은 입력 창, Enter로 `POST /api/app/ideas`, 저장되면 "저장했어요, 열기"

## 4. 자동 업데이트 (Sparkle 2)
- 하루 한 번 확인. 새 판이 있으면 Sparkle 기본 창 → "설치하고 다시 시작"
- `appcast.xml`과 `.dmg`는 GitHub Releases (레포 공개). appcast 주소는 `releases/latest/download/appcast.xml`
- 출시 스크립트 `macos/scripts/release.sh <버전>` (종원의 맥에서 직접 실행, CI 없음): next build(standalone) → Node 받기, lipo → xcodebuild archive → Developer ID 서명(hardened runtime) → `notarytool submit --wait` → `stapler staple` → `.dmg` → Sparkle `sign_update` → appcast 갱신 → `gh release create`
- 종원이 처음 한 번 직접 할 일 (비밀값은 AI가 다루지 않는다): `xcrun notarytool store-credentials hatch-notary`, Sparkle `generate_keys`(개인 키는 키체인). 공개 키만 `Info.plist`에 넣는다

### 4-1. 서명할 때
- 번들 안의 실행 파일 전부(`node`, Sparkle의 XPC, Autoupdate, `.node` 네이티브 모듈이 있으면 그것도)를 안쪽부터 서명
- Node는 JIT를 쓴다 → hardened runtime + `com.apple.security.cs.allow-jit`. 그 밖의 예외 권한은 실제로 막힐 때만 하나씩 더하고 이유를 `macos/CLAUDE.md`에 적는다
- App Sandbox는 쓰지 않는다 (`~/Hatch` 읽기 쓰기, `claude` 실행, 터미널 열기). Mac App Store는 범위 밖

## 5. 오류
| 상황 | 앱이 하는 일 |
| --- | --- |
| 서버가 30초 안에 `status`에 답하지 않음 | 네이티브 화면 "Hatch를 켜지 못했어요" + `다시 시작`, `로그 보기` |
| 쓰는 중 서버가 죽음 | 한 번은 조용히 다시 켜고 창을 새로고침. 1분 안에 또 죽으면 위 화면 |
| 데이터 폴더를 못 씀 (권한, 외장 디스크 빠짐) | 이유 + `다른 폴더 고르기`. 데이터를 지우거나 옮기지 않는다 |
| claude 없음, 로그인 풀림 | 화면은 지금 오류 문구 그대로, 메뉴 막대 `!` → §2-1 확인 화면 |
| 만드는 중 ⌘Q | "PRD를 만드는 중이에요. 끝내면 이 문서는 만들어지지 않아요", `기다리기` / `끝내기` (E5) |
| 업데이트 실패 | Sparkle 기본 안내 |

로그: `~/Library/Logs/Hatch/server.log` (서버 stdout, stderr, 5MB 넘으면 `server.1.log`로 넘기고 하나만 남김). 응답 본문, 프롬프트, 토큰은 로그에 쓰지 않는다 (서버 쪽 기존 규칙).

## 6. 테스트
- **Next (vitest, E1)**: `/api/app/*` — 토큰 없음 404, 틀림 401, 맞음 200, `status` 모양, `finished` 20개 넘으면 오래된 것부터 빠짐, 아이디어 저장 검사. 기존 검증 `npm run lint && npm run typecheck && npm test && npm run build`는 그대로 통과
- **Swift (Swift Testing, E2~E5)**: claude 경로 찾기(가짜 폴더), 빈 포트 고르기, 설정 → 환경 변수, `status` JSON 읽기, 본 알림 다시 안 알리기, 서버 프로세스 켜기 / 끄기 / 죽으면 다시 켜기 (가짜 서버 스크립트)
- **앱 전체 (E2부터 PR마다)**: `macos/scripts/build.sh`로 서명 없는 `.app` → 켜서 창이 뜨는지 → `HATCH_CLAUDE_BIN=fake-claude.mjs`로 문서 생성 → 메뉴 막대 상태, 알림 확인. 화면 확인은 지금처럼 사람이 눌러 본다
- **설치 경험 (E6, E7)**: 새 macOS 사용자 계정에서 `.dmg` 설치 → Claude Code 없는 첫 실행 → 설치 안내 → 생성까지. `spctl --assess --type execute`, `stapler validate` 통과. 이전 판에서 새 판으로 Sparkle 업데이트 한 번

## 7. 작업 나누기 (마일스톤 E)
| PR | 내용 | 끝나면 |
| --- | --- | --- |
| E1 | Next: `standalone` 출력, `/api/app/status`, `/api/app/ideas`, `HATCH_APP_TOKEN`, 끝난 작업 기록, 공유 꺼짐 문구 확인 | 웹, 데모 그대로, 앱이 쓸 주소 준비 |
| E2 | 앱 뼈대: 서버 띄우기, WKWebView 창, 로그, 오류 화면, `build.sh` | 내 맥에서 앱으로 켜짐 (서명 없음, 시스템 Node). 확인용 `HATCH_APP_DATA_DIR`, `HATCH_APP_CLAUDE_BIN` |
| E3 | 첫 실행, claude 찾기, 설정(데이터 폴더, claude 경로, 포트, 공유 키체인, Tailscale 주소) | Claude Code 없는 맥에서도 안내가 이어짐 |
| E4 | 메뉴, 단축키, 바깥 링크, 메뉴 막대, 빠른 아이디어 | 맥 앱처럼 다룸 |
| E5 | 알림 | 창을 안 봐도 끝난 걸 앎 |
| E6 | Node 번들(universal), 서명, 공증, `.dmg` 스크립트 | 다른 사람에게 `.dmg`를 줄 수 있음 |
| E7 | Sparkle, appcast, `release.sh`, GitHub Release | 새 판이 자동으로 감 |

PR마다 이슈 1개, `hatch-reviewer`, why 기록(사용자가 느끼는 동작이 바뀌는 E2, E3, E6, E7). E1은 web 영역(`area:infra`), E2~E7은 새 라벨 `area:macos`.

## 8. 범위 밖 (v1)
API 키 생성, Mac App Store, App Sandbox, 앱이 Tailscale을 직접 켜기, 웹 화면을 SwiftUI로 다시 그리기, Windows, Linux 설치 파일, 여러 창, 앱 안 설문.

## 9. 위험
- 높음, 서명: Node 같은 번들 실행 파일이 hardened runtime에서 막힐 수 있다. E6 첫날 서명, 공증만 먼저 통과시켜 본다
- 중간, 크기: Node universal(약 90MB) + standalone. 신호: 150MB가 넘으면 arm64, Intel 판을 나눈다
- 중간, claude 찾기: 설치 방식마다 경로가 다르다. 못 찾은 사례가 두 번 넘으면 찾는 곳을 늘린다
- 중간, DNS rebinding: 다른 사이트가 127.0.0.1 포트의 페이지와 Server Action을 부를 수 있다. E2에서 HATCH_APP_TOKEN이 있을 때 proxy.ts로 Host를 127.0.0.1:<포트>, localhost:<포트>만 받게 한다
- 낮음, 데이터: 웹 버전과 앱을 동시에 켜면 같은 `~/Hatch`에 둘이 쓴다. 생성 중 표시가 파일이라 겹침은 지금과 같다. 앱이 켜질 때 3000 포트에 다른 Hatch가 떠 있으면 "웹 버전이 켜져 있어요"를 알린다
