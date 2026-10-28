# 프로젝트 세팅 실행 계획

> spec: [docs/specs/2026-10-28-workflow-design.md](../specs/2026-10-28-workflow-design.md) · 이슈 #1 · 브랜치 `chore/1-project-setup`

**Goal:** 기능 구현 전에 Next.js 뼈대 · 폴더별 CLAUDE.md · 에이전트 · 스킬 · GitHub 규칙을 갖춘다.

**Tech Stack:** Next.js(App Router) · TypeScript · npm · Montage 4.1.5 · GitHub(gh) · GitHub Actions

## Global Constraints

- 패키지 매니저 npm. `@montage-ui/*` 는 전부 같은 버전(4.1.5) 고정.
- 루트 CLAUDE.md ≤ 60줄, 폴더 CLAUDE.md ≤ 30줄. 칸: 목적 · 파일 지도 · 규칙 · 하지 말 것 · 자세히.
- 커밋 `<type>(<area>): 내용 (#1)`. `main` 직접 push 금지. 머지는 사용자 승인 후.

---

### Task 1: Next.js 뼈대 + Montage

**Files:** create-next-app 결과물(`src/app/*`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `.gitignore`) ·
Create `src/app/providers.tsx` · Modify `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] 스크래치 폴더에 `npx create-next-app@latest hatch --ts --eslint --app --src-dir --no-tailwind --import-alias "@/*" --use-npm` → README·.git 제외하고 복사 (비어 있지 않은 폴더 충돌 회피)
- [ ] `npm i @montage-ui/core@4.1.5 @montage-ui/icon@4.1.5 @montage-ui/nextjs@4.1.5`
- [ ] `providers.tsx`(client): `AppRouterCacheProvider` → `ThemeProvider` 감싸기. `layout.tsx`: `lang="ko"`, Pretendard 링크, `@montage-ui/core/global.css`, Providers
- [ ] `page.tsx`: Montage `Typography`로 "Hatch" 한 줄 (설치 확인용)
- [ ] `package.json` scripts에 `"typecheck": "tsc --noEmit"`
- [ ] 검증: `npm run lint && npm run typecheck && npm run build` 모두 통과
- [ ] 커밋 `chore(infra): Next.js 뼈대와 Montage 설치 (#1)`

### Task 2: 폴더별 CLAUDE.md

**Files:** Create `CLAUDE.md`, `docs/CLAUDE.md`, `src/app/CLAUDE.md`, `src/app/tools/CLAUDE.md`, `src/components/CLAUDE.md`,
`src/lib/storage/CLAUDE.md`, `src/lib/chain/CLAUDE.md`, `src/lib/prompts/CLAUDE.md`, `bridge/CLAUDE.md`

- [ ] 루트: 한 줄 소개 · 폴더 지도 표 · 현재 단계(A 시작 전) · 작업 흐름 · 검증 명령 · 에이전트 표 · Git 규칙 요약(→ `docs/CLAUDE.md`)
- [ ] 폴더 8개: spec §2의 역할 · 해당 단계 규칙 · 하지 말 것 · 담당 에이전트
- [ ] 검증: `wc -l` 로 루트 ≤ 60, 나머지 ≤ 30
- [ ] 커밋 `docs(infra): 폴더별 CLAUDE.md (#1)`

### Task 3: 에이전트 5 + 스킬 3

**Files:** Create `.claude/agents/{ui-builder,chain-author,tool-builder,bridge-engineer,hatch-reviewer}.md`,
`.claude/skills/{montage-ui,new-po-tool,chain-step}/SKILL.md`

- [ ] 에이전트: frontmatter(name · description · tools) + 맡는 폴더 · 먼저 읽을 CLAUDE.md · 끝나면 보고 형식
- [ ] `hatch-reviewer`: 검사 목록(프롬프트 위치 · 하드코딩 색 · `var(--` 직접 사용 · 영역 침범 · CLAUDE.md 줄 수) + 출력 형식
- [ ] `montage-ui`: 공식 montage-react 스킬 요약(MIT 출처 표기), MCP 대신 `node_modules/@montage-ui/core` 타입 조회
- [ ] `new-po-tool`, `chain-step`: 기능 spec 전이라 절차 · 체크리스트만 (파일 경로는 단계 spec에서 확정 후 갱신한다고 명시)
- [ ] 검증: 모든 파일 frontmatter에 name · description 존재 (`grep -L '^name:'` 결과 없음)
- [ ] 커밋 `chore(infra): 영역별 에이전트와 스킬 (#1)`

### Task 4: GitHub 규칙

**Files:** Create `.github/ISSUE_TEMPLATE/task.md`, `.github/pull_request_template.md`, `.github/workflows/ci.yml`, `.githooks/pre-push`, `docs/CLAUDE.md`(Git 규칙 절)

- [ ] 이슈 · PR 템플릿 (spec §6)
- [ ] `ci.yml`: PR · main push → `npm ci && npm run lint && npm run typecheck`
- [ ] `pre-push`: 대상 ref가 `refs/heads/main` 이면 거부. `git config core.hooksPath .githooks`
- [ ] gh: 라벨 10개, 마일스톤 A~D, 레포 설정(squash만 · 머지 후 브랜치 삭제), 이슈 #1 생성
- [ ] 검증: `git push origin HEAD:main --dry-run` 이 훅에 막힘 · `gh label list` · `gh api repos/JJongW/hatch` 설정값
- [ ] 커밋 `chore(infra): 이슈·PR 템플릿, CI, pre-push 훅 (#1)`

### Task 5: 검증과 PR

- [ ] `npm run lint && npm run typecheck && npm run build`
- [ ] `hatch-reviewer` 에이전트로 전체 검사 → 지적 반영
- [ ] push → `gh pr create` (closes #1) → CI 결과 확인 → 사용자에게 머지 승인 요청
