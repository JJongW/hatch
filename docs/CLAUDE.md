# docs/ — 설계 · 계획 · Git 규칙

## 파일 지도
- `specs/YYYY-MM-DD-<주제>-design.md` — 단계별 설계 (무엇을 · 왜)
- `plans/YYYY-MM-DD-<주제>.md` — 실행 계획 (Task 단위 체크리스트)

## 이슈
- 마일스톤 = 단계(A~D). 작업 1개 = 이슈 1 = 브랜치 1 = PR 1
- 라벨: `area:{bank,chain,tools,design,bridge,infra}` + `type:{feat,fix,docs,chore}`

## 브랜치 · 커밋
- `main` 직접 push 금지 (`.githooks/pre-push`가 막음)
- 브랜치 `<type>/<이슈번호>-<짧은이름>` 예: `feat/12-idea-list`
- 커밋 `<type>(<area>): 내용 (#이슈)` 예: `feat(bank): 아이디어 저장 (#12)`

## PR · 머지
- 템플릿 칸 모두 채움: 개요 · closes #n · 변경 · 검증(명령 → 결과) · 화면 캡처(UI) · 리뷰어 결과
- PR 하나 = 영역 하나. 400줄 / 15파일 넘으면 쪼갠다
- 머지 조건: 검증 통과 + `hatch-reviewer` 지적 0(남기면 이유) + UI는 Vercel 미리보기 확인
- **squash만. 머지는 사용자 승인 후.** 머지 후 브랜치 자동 삭제

## 하지 말 것
- spec 없이 단계 구현 시작
- plan 체크박스를 실제로 안 한 채 체크
