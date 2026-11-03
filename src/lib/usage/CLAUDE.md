# src/lib/usage — 사용량 계산 (순수)

`summarizeUsage(entries, ideaId?)` → 전체 합계, 기능별 줄, 아이디어별 줄, 효율 신호. `formatTokens` · `formatCost`는 화면 표시용.
- 입력은 `listUsage()`(storage)의 결과. 파일을 직접 읽지 않는다
- 신호 기준은 `SIGNAL` 한 곳 (spec: docs/specs/2026-10-30-usage-design.md §4)
- 비용은 claude가 주는 정가 기준 추정. 구독은 실제 청구 아님 — 화면에 늘 같이 적는다
- `pilot.ts`는 채팅 vs Hatch 파일럿 고정 값 (spec §10). 사람 테스트 결과가 나오면 바꾼다
