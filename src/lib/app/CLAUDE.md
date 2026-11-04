# src/lib/app/ — 맥 앱 전용

맥 앱(`macos/`)이 번들 안의 Next 서버와 이야기하는 곳. spec: `docs/specs/2026-11-04-macos-app-design.md`

- `token.ts`: `HATCH_APP_TOKEN`이 없거나 데모면 꺼짐(404). 머리 `x-hatch-app-token`이 다르면 401. 비교는 `timingSafeEqual`
- `jobs.ts`: 생성 중과 끝난 작업(최근 20개). 서버 메모리라 다시 켜면 빈다. 알림 제목과 본문은 여기서 만든다
- `track.ts`: Server Action이 시작에 부르고 끝에 결과를 넘긴다. claude가 바쁘면 알리지 않는다
- 웹 버전(`HATCH_APP_TOKEN` 없음)에서도 Server Action 셋은 작업을 메모리에 남긴다. 생성마다 `getIdea` 한 번을 더 읽고 끝난 기록은 20개까지라, 사용자에게 보이는 건 없다
- `quick-idea.ts`: 메뉴 막대 빠른 아이디어. 첫 줄 제목, 나머지 메모, 2,000자까지

## 규칙
- 앱 전용 주소는 `src/app/api/app/*`에만. 모든 주소가 맨 먼저 `appAuth`를 부른다
- 응답과 로그에 비밀값, 프롬프트, 문서 본문을 쓰지 않는다
- 응답 모양을 바꾸면 Swift 쪽(`macos/`) 디코더와 같은 PR에서 바꾼다
- standalone 번들은 next.config.ts의 outputFileTracingExcludes로 소스를 뺀다. 새 최상위 폴더를 만들면 거기에 더한다
- 작업 목록을 파일로 옮기는 신호: 서버를 다시 켠 뒤 놓친 알림이 문제라는 말이 나오면
