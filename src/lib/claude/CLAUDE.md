# src/lib/claude — claude -p 실행기

로컬 `claude -p`를 띄워 JSON 스키마로 구조화된 결과(`structured_output`)를 받는다. `runClaude` · `isClaudeBusy` · `ChainError`.

- 인자: `-p --output-format json --json-schema <스키마> --tools "" --no-session-persistence --setting-sources project` (+ `--model`). 프롬프트는 stdin.
- 전역 ~/.claude/CLAUDE.md가 섞이지 않게 `--setting-sources project` (2026-10-28 확인: 없으면 전역 지시가 읽힘)
- env: `HATCH_CLAUDE_BIN`(기본 `claude`) · `HATCH_CLAUDE_MODEL`(선택).
- 동시 실행 1개, 5분 초과 시 종료, 작업 폴더는 빈 임시 폴더.
- 보안: 도구 없음(`--tools ""`). 프롬프트 본문은 로그에 남기지 않는다(stderr 앞 500자만).
- 오류는 `ChainError`(한국어 한 줄)로 던진다. 화면에 그대로 보여 준다.
- 호출은 `src/lib/chain/generate.ts`(문서) · `src/lib/questions/make.ts`(확인 질문) · `src/lib/tools/run.ts`(도구). 모두 `tag`(기능 · 아이디어 · 다시 만들기)를 넘긴다. 호출이 끝나면 `usage.jsonl`에 한 줄을 남긴다 (`stats.ts`가 결과 JSON에서 숫자를 꺼냄).
- 테스트는 `fake-claude.mjs`(`FAKE_CLAUDE=ok|plan|error|crash|slow|usage`)를 `HATCH_CLAUDE_BIN`으로 쓴다. 실제 claude는 돌리지 않는다. 테스트는 임시 `HATCH_DATA_DIR` 필수 (장부가 실제 `~/Hatch`에 쌓이지 않게).
