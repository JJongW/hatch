# A. 아이디어 뱅크 실행 계획

> spec: [docs/specs/2026-10-28-a-idea-bank-design.md](../specs/2026-10-28-a-idea-bank-design.md) · 이슈 #3 · 브랜치 `feat/3-idea-bank`

**Goal:** 로컬에서 아이디어를 쓰고 · 모아 보고 · 상세로 들어가는 앱. 저장은 `$HATCH_DATA_DIR`(기본 `~/Hatch`)의 md.

**Tech Stack:** Next.js 16 · Montage 4.1.5 · gray-matter · vitest · server-only

## Global Constraints

- Next 16: `params`는 Promise (`await params`). 파일을 읽는 페이지는 `await connection()`로 빌드 시 사전 렌더 제외
- Server Action은 `'use server'` 파일(`src/app/actions.ts`)에. storage는 서버 컴포넌트 · Server Action에서만 import (`server-only`)
- Montage 컴포넌트를 쓰는 파일은 `'use client'`. 색은 토큰만
- 커밋 `<type>(bank): 내용 (#3)`

---

### Task 1: 저장 함수 (TDD)

**Files:** Create `vitest.config.ts`, `src/lib/storage/{types,ids,ideas,progress,index}.ts`, `src/lib/storage/ideas.test.ts`, `src/lib/storage/progress.test.ts` · Modify `package.json`(test 스크립트)

**Produces:** `Idea`, `Doc`, `DOC_STEPS`, `listIdeas()`, `getIdea(id)`, `createIdea({title, memo})`, `updateIdea(id, patch)`, `trashIdea(id)`, `getDocs(id)`, `progressOf(docs)`, `isValidId(id)` — 시그니처는 spec §3

- [ ] `npm i gray-matter server-only` · `npm i -D vitest` · `"test": "vitest run"`
- [ ] 테스트 먼저: 임시 폴더를 `HATCH_DATA_DIR`로 — 만들기/목록 최신순/읽기/수정(updatedAt 변화)/빈 제목 거부/휴지통 이동 후 목록 제외/깨진 파일 건너뜀(unreadable 1)/잘못된 id 거부(`../x`)/getDocs 6칸 순서와 파일 내용/progressOf
- [ ] 실패 확인 → 구현 → `npm test` 통과
- [ ] 커밋 `feat(bank): md 저장 함수와 테스트 (#3)`

### Task 2: 레이아웃 + 네비바

**Files:** Create `src/app/_components/side-nav.tsx`, `src/app/_components/app-shell.tsx` · Modify `src/app/layout.tsx`

- [ ] 좌측 네비바: 로고 · 쓰기(`/`) · 모음(`/ideas`) · 구분선 · PO 도구 4개(링크 없음, "준비 중"). 현재 경로 강조(`usePathname`)
- [ ] 좁은 화면(< sm)에서는 네비바가 위로 가로 배치
- [ ] lint · typecheck

### Task 3: 화면 3개 + Server Action

**Files:** Create `src/app/actions.ts`, `src/app/_components/idea-form.tsx`, `src/app/_components/idea-card.tsx`, `src/app/ideas/page.tsx`, `src/app/ideas/[id]/page.tsx`, `src/app/ideas/[id]/idea-detail.tsx` · Modify `src/app/page.tsx`

- [ ] `actions.ts`: `createIdeaAction` · `updateIdeaAction` · `trashIdeaAction` → storage 호출 → `revalidatePath` · 오류는 `{ error: string }` 반환 (빈 제목 · 저장 실패)
- [ ] `/`: 쓰기 폼(제목 Enter 저장, 메모 선택) + 최근 5개
- [ ] `/ideas`: 카드 목록(제목 · 메모 첫 줄 · 날짜 · 진행 배지) · 빈 상태 · "읽지 못한 파일 n개"
- [ ] `/ideas/[id]`: 수정 폼 · 휴지통(확인 후 → `/ideas`로) · 문서 6칸(`pre` 원문 / "B 단계에서 생성") · 없는 id는 `notFound()`
- [ ] `npm run lint && npm run typecheck && npm run build && npm test`
- [ ] 커밋 `feat(bank): 네비바와 쓰기 · 모음 · 상세 화면 (#3)`

### Task 4: 확인 · 문서 · PR

- [ ] 임시 데이터 폴더로 dev 서버 → 브라우저로 쓰기 → 모음 → 상세 → 수정 → 휴지통 흐름, 콘솔 오류 없음
- [ ] 루트 CLAUDE.md: 현재 단계 · 검증 명령에 `npm test` · `.env.example`(`HATCH_DATA_DIR`) · storage CLAUDE.md 갱신
- [ ] `hatch-reviewer` → 지적 반영 → PR (closes #3)
