# Hatch 작업 체계 설계 (2026-10-28)

코드를 쓰기 전에 정하는 **작업 틀**: 폴더 구조 · 폴더별 CLAUDE.md · 에이전트 · 스킬 · 이슈/PR/머지 규칙.
제품 기능(A~D)의 상세 설계는 각 단계 시작 때 별도 spec으로 쓴다.

## 1. 원칙

- Claude Code는 루트 `CLAUDE.md`를 항상, **하위 폴더 `CLAUDE.md`는 그 폴더 파일을 읽을 때만** 로드한다.
  → 규칙은 쓰이는 폴더에 둔다. 루트는 지도, 폴더는 그 폴더 규칙만.
- 분량 한도: 루트 60줄, 폴더 30줄. 넘으면 `docs/`로 빼고 링크만 남긴다.
- 폴더 CLAUDE.md 기본 칸: **목적(1줄) · 파일 지도 · 규칙 · 하지 말 것**. 필요할 때만 **갈아탈 신호 · 자세히(링크)** 추가.

## 2. 폴더 구조

| 경로 | 역할 | 단계 |
| --- | --- | --- |
| `CLAUDE.md` | 지도 · 현재 단계 · 검증 명령 · 작업 흐름 | 전체 |
| `docs/` | specs(설계) · plans(실행 계획) | 전체 |
| `src/app/` | 라우트 · 레이아웃 · 좌측 네비바 | A |
| `src/app/tools/` | PO 도구 공통 틀 + 도구별 화면 | C |
| `src/components/` | 공용 UI. Montage 기반 | D |
| `src/lib/storage/` | 아이디어 · 문서 저장 (처음엔 브라우저 저장) | A |
| `src/lib/chain/` | 문서 생성 체인 단계 정의 | B |
| `src/lib/prompts/` | 프롬프트 문자열 — **여기에만** | B · C |
| `bridge/` | 맥 중계 서버 (`claude -p`) + Tailscale | B |

## 3. 에이전트 (`.claude/agents/`)

| 이름 | 영역 | 도구 |
| --- | --- | --- |
| `ui-builder` | A 화면, D 다듬기. Montage 컴포넌트만 | Read · Edit · Write · Bash · Grep · Glob |
| `chain-author` | B 체인 단계 · 프롬프트 · 입출력 스키마 | Read · Edit · Write · Bash · Grep · Glob |
| `tool-builder` | C 도구 하나 (4개 병렬, worktree별) | Read · Edit · Write · Bash · Grep · Glob |
| `bridge-engineer` | 중계 서버 · `claude -p` · 토큰 · CORS | Read · Edit · Write · Bash · Grep · Glob |
| `hatch-reviewer` | 읽기 전용 규칙 검사 | Read · Grep · Glob · Bash(읽기 명령만) |

## 4. 스킬 (`.claude/skills/`) — 반복되는 레시피만

- `montage-ui`: Montage 사용 규칙 요약. 공식 MCP(`@wanteddev/montage-mcp`)는 **@wantedlab.com 계정 전용**이라 쓸 수 없어,
  컴포넌트 스펙은 `node_modules/@montage-ui/core`의 타입 파일에서 찾게 한다. (원본: montage-web `montage-react` 스킬, MIT)
- `new-po-tool`: PO 도구 하나 추가 (C에서 4번)
- `chain-step`: 체인 단계 하나 추가 (B에서 6번)
- 단계 공통 흐름(설계 → 계획 → 구현)은 기존 superpowers 스킬 사용. 새로 만들지 않는다.
- 신호: 같은 순서를 손으로 3번 넘게 반복하면 스킬로 만든다.

## 5. 단계별 흐름

```
spec(docs/specs) → plan(docs/plans) → 이슈 → 브랜치 → 구현(영역 에이전트)
→ hatch-reviewer → lint · typecheck · build → PR → (사용자 승인) squash 머지
```
- A, B: 순차. C: 공통 틀 PR 머지 후 도구 4개를 worktree에서 `tool-builder` 병렬. D: A부터 계속 적용, 마지막에 다듬기.

## 6. 이슈 · 브랜치 · 커밋 · PR · 머지

- **이슈**: 마일스톤 = 단계(A~D). 작업 1개 = 이슈 1 = 브랜치 1 = PR 1.
  라벨 `area:{bank,chain,tools,design,bridge,infra}` + `type:{feat,fix,docs,chore}`. 템플릿: 목표 · 완료 조건 · 관련 spec.
- **브랜치**: `main` 직접 push 금지. `<type>/<이슈번호>-<짧은이름>` (예: `feat/12-idea-list`).
- **커밋**: `<type>(<area>): 내용 (#이슈)` (예: `feat(bank): 아이디어 저장 (#12)`).
- **PR**: 템플릿 = 개요 · `closes #n` · 변경 · 검증(명령 → 결과) · 화면 캡처(UI) · 리뷰어 결과.
  PR 하나 = 영역 하나. 400줄 / 15파일 넘으면 쪼갠다.
- **머지**: squash만. 조건 = 검증 통과 + 리뷰어 지적 0(남기면 이유) + UI PR은 Vercel 미리보기 확인.
  **머지는 사용자 승인 후.** 머지 후 브랜치 자동 삭제.
- **강제 장치**: 무료 플랜 비공개 레포라 GitHub 브랜치 보호 불가 →
  로컬 `pre-push` 훅(`.githooks/`, `core.hooksPath`)이 `main` push 차단 · 레포 설정(squash만, 머지 후 삭제) ·
  CI(GitHub Actions)는 쓰지 않는다 — 검증은 로컬 명령으로.

## 7. 기술 결정

- Next.js(App Router) + TypeScript, 패키지 매니저 **npm** (이 맥의 pnpm 11은 Node 23.3에서 실행 안 됨).
- Montage `@montage-ui/core` · `icon` · `nextjs` **같은 버전**(현재 4.1.5)으로 고정. Emotion 기반이라 `AppRouterCacheProvider` + `ThemeProvider`를 루트 레이아웃에.
- 폰트 Pretendard(Montage 요구).

## 8. 범위 밖 (이번 작업에서 안 함)

- 기능 화면 구현, 저장 로직, 체인, 중계 서버 코드 — 각 단계 spec에서.
- Vercel 프로젝트 연결 — B 단계(bridge)에서. A는 로컬 전용 (A spec §1).
