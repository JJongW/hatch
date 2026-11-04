# macos/ — Hatch 맥 앱

Swift 패키지 하나. spec: `docs/specs/2026-11-04-macos-app-design.md`. Xcode 프로젝트 파일은 만들지 않는다.

| 경로 | 역할 |
| --- | --- |
| `Sources/HatchCore/` | 로직 (비밀값, 포트, 서버 환경, node 찾기, 로그, 서버 프로세스, 준비 확인). UI를 import하지 않는다 |
| `Sources/Hatch/` | SwiftUI 앱 (창, 켜는 중, 오류 화면) |
| `Tests/HatchCoreTests/` | Swift Testing. `Fixtures/fake-server.mjs`가 가짜 서버 |
| `scripts/build.sh` | 서명 없는 `dist/Hatch.app` 묶기 |

## 명령
- 테스트: `cd macos && swift test`
- 앱 만들기: `macos/scripts/build.sh` (레포 뿌리의 Next 빌드를 같이 한다)
- 개발 확인: `open -n --env HATCH_APP_DATA_DIR=<임시 폴더> macos/dist/Hatch.app`. 사용자 `~/Hatch`로 확인하지 않는다
- 앱의 서버 프로세스는 이름이 `next-server`로 바뀐다. server.js로 grep하지 말고 `pgrep -P <Hatch PID>`로 찾는다

## 규칙
- 로직은 HatchCore에 두고 테스트한다. 화면 쪽(Hatch)은 상태를 보여 주기만 한다
- 서버는 127.0.0.1에만. 앱 비밀값은 로그, 화면, 커밋에 쓰지 않는다
- 서버에 넘기는 HATCH_ 값은 `ServerConfig.environment`가 정한 것뿐이다. 앱 밖의 HATCH_ 값은 버린다
- node는 E2까지 시스템 것, E6부터 번들 것 (`NodeLocator`)
- 서버 응답 모양(`/api/app/*`)을 바꾸면 `src/lib/app/`과 같은 PR에서 바꾼다
- 서명 예외 권한은 실제로 막힐 때만 하나씩 더하고 여기에 이유를 적는다 (E6)
