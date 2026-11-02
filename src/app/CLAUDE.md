# src/app/ — 라우트 · 레이아웃 · 네비바 (A)

담당: `ui-builder` · UI 규칙은 `montage-ui` 스킬

## 파일 지도
- `layout.tsx` (서버) → `providers.tsx` (Montage Theme → Cache) → `_components/app-shell.tsx` (네비바 + 본문)
- `/` `page.tsx` 쓰기 · `/ideas` 모음(`?folder=` 폴더 칩) · `/ideas/[id]` 상세(`idea-detail.tsx`, 문서 탭 진행 계산은 `chain-progress.ts`) · `tools/` PO 도구 (C) · `/usage` 사용량(`?idea=`)
- `actions.ts` — Server Action (쓰기 · 수정 · 휴지통 · 문서 생성/편집). storage · chain 호출 + `revalidatePath`
- `_components/` — 이 라우트들만 쓰는 화면 조각 (2곳 넘게 쓰이면 `src/components/`로). `doc-markdown` · `use-refresh-while`은 문서 상세와 도구 틀이 공용 · `skeletons`는 경로별 `loading.tsx`, `running-note`는 생성 중 표시가 공용
- `error.tsx` · `not-found.tsx` — 오류 · 없는 주소 화면 (네비바는 그대로, 다음 행동 버튼)
- `tools/_frame/` — 도구 공통 틀 (`load.ts` 서버 로더 · `tool-frame.tsx`). 자세히는 `tools/CLAUDE.md`

## 규칙
- 페이지(서버)가 storage를 읽어 client 컴포넌트에 props로. storage · chain · `@/lib/tools`는 페이지 · `actions.ts`에서만 import (예외: 도구 페이지만 부르는 서버 전용 `tools/_frame/load.ts`)
- Montage 컴포넌트는 Emotion이라 `'use client'`. 날짜 포맷은 서버에서 (hydration 차이)
- **Next 16**: 파일을 읽는 페이지는 `await connection()` + 그 경로에 `loading.tsx` (Suspense 경계).
  없으면 build 실패 / 이동 시 dev 경고. `usePathname`도 Suspense 안에서 (`app-shell.tsx` 참고)
- 항상 요청 시 렌더하는 로컬 페이지는 `export const instant = false` — dev 콘솔의 blocking-route 검증 오류를 끈다 (docs: instant 'Disabling instant')
- 동적 경로 `params`는 Promise (`await params`)
- Server Action은 클라이언트에서 한 번에 하나씩 실행된다 — 긴 작업(문서 생성) 중엔 다른 제출 버튼을 `disabled`로 막는다

## 하지 말 것
- 페이지 안에 프롬프트 문자열 (→ `src/lib/prompts/`)
- 파일 · `localStorage` 직접 접근 (→ `src/lib/storage/`)
- Next.js API를 기억으로 쓰기 — `node_modules/next/dist/docs/` 확인
