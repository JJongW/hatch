# 문서 체인 진행 표시 구현 계획 (#78)

spec: [2026-11-02-chain-progress-design.md](../specs/2026-11-02-chain-progress-design.md). 브랜치 `feat/78-chain-progress`. PR 하나.

- [x] 1. 상태 계산 `chainProgress` (상세 화면 옆 `chain-progress.ts`, 클라이언트에서 쓰므로 storage 밖). 단위 테스트 6개
- [x] 2. 문서 탭: 상태 표시(체크, 점, 원), 상태 글씨 secondary, 탭 위 요약 한 줄, 깜빡임 키프레임 `hatch-pulse`
- [x] 3. 목록 카드 "N/7" (`listIdeasWithProgress`에 done, total)
- [x] 4. 생성 시작 알림을 폼 제출 순간으로 옮김 (생성 중 탭 표시와 다른 버튼 막기가 안 되던 문제)
- [x] 5. agent-browser: 상세 탭과 요약 줄, 실제 생성 2번(데이터 구성, 개발 프롬프트) 중 탭 상태와 다른 버튼 disabled, 목록 카드, iPhone 14 폭, 줄인 모션, 페이지 오류 0
- [x] 6. `npm run lint && npm run typecheck && npm test && npm run build`
