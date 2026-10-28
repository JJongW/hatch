# src/app/ — 라우트 · 레이아웃 · 네비바 (A)

담당: `ui-builder` · UI 규칙은 `montage-ui` 스킬

## 파일 지도
- `layout.tsx` — html · Pretendard · `Providers`. 서버 컴포넌트 유지(metadata)
- `providers.tsx` — Montage `ThemeProvider` → `AppRouterCacheProvider` (client)
- `page.tsx` — 홈 (A에서 아이디어 작성 화면)
- `tools/` — PO 도구 (C) → [tools/CLAUDE.md](tools/CLAUDE.md)
- 라우트 계획(A spec에서 확정): `/` 작성 · `/ideas` 모음 · `/ideas/[id]` 기획안 · `/tools/*`

## 규칙
- 페이지는 화면 조립만. 저장은 `@/lib/storage`, 생성은 `@/lib/chain` 호출
- Montage 컴포넌트는 Emotion을 써서 `'use client'` 필요. 페이지 전체보다 필요한 컴포넌트만 client로
- 좌측 네비바는 레이아웃 한 곳에서만 정의

## 하지 말 것
- 페이지 안에 프롬프트 문자열 (→ `src/lib/prompts/`)
- `localStorage` 직접 접근 (→ `src/lib/storage/`)
- Next.js API를 기억으로 쓰기 — `node_modules/next/dist/docs/` 확인
