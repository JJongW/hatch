# 데이터 구성 단계 Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능명세와 디자인 프롬프트 사이에 `데이터 구성` 문서를 더한다. 엔티티와 필드를 정의하고 mermaid 구성도(ERD)를 문서 탭에 그림으로 보여 준다 (#49).

**Architecture:** 새 체인 단계 `data`는 다른 단계와 같은 꼴(zod 스키마 + render, 프롬프트는 `prompts/chain/`)이다. 구성도는 코드가 JSON에서 mermaid 텍스트를 만든다. 화면은 `doc-markdown`의 펜스 블록 중 `mermaid`만 클라이언트에서 `mermaid` 패키지를 동적 import해 그린다.

**Tech Stack:** Next.js 16 · React 19 · Montage UI · zod · mermaid 11 · vitest

spec: [docs/specs/2026-10-29-data-model-step-design.md](../specs/2026-10-29-data-model-step-design.md)

## Global Constraints
- 화면 문구 · 렌더 문구에 가운데 점(·)을 쓰지 않는다
- 문서 자리는 `docPath`를 따른다 (`ideas/<id>/docs/data.md`)
- 앱 프롬프트를 바꾸면 `docs/ai-usage/prompts.md` §5에 한 줄
- 커밋 `<type>(chain): 내용 (#49)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

### Task 1: data 단계 (스키마 · 렌더 · 프롬프트 · 연결)
**Files:** Create `src/lib/chain/steps/data.ts` · `data.test.ts` · `src/lib/prompts/chain/data.ts` / Modify `src/lib/storage/types.ts` · `src/lib/chain/registry.ts` · `src/lib/chain/steps/design-prompt.ts` · `src/lib/prompts/chain/design-prompt.ts` · 단계 수 테스트들 · `src/lib/chain/CLAUDE.md`
- [ ] `data.test.ts` 먼저: 정상 렌더(구성도 블록, 엔티티 목록, 관계 기호 3종), 빈 관계 `- 없음`, 없는 엔티티를 가리키는 관계 실패, key 중복 실패, 한국어 key 실패, `"` → `'`
- [ ] `data.ts` 구현, 테스트 통과
- [ ] `DOC_STEPS`에 `data` (spec 뒤), design-prompt `from: 'data'` + 단계 `extra: ['spec']`, `CHAIN` 등록
- [ ] 단계 수 테스트(generate · ideas · summary) 7개로, design-prompt가 data 없이 만들면 "앞 문서를 먼저 만들어 주세요."
- [ ] 프롬프트 `DATA_PROMPT`, `DESIGN_PROMPT_PROMPT` 한 줄 추가, `prompts.md` §5 기록
- [ ] 커밋

### Task 2: mermaid 그림
**Files:** Create `src/app/_components/mermaid-block.tsx` / Modify `src/app/_components/doc-markdown.tsx` · `code-block.tsx` · `package.json`
- [ ] `npm i mermaid@^11`
- [ ] `MermaidBlock`: 동적 import → render → SVG. 그리는 중 자리 상자, 실패하면 `CodeBlock`. 아래 "구성도 코드 복사"
- [ ] `Pre`에서 `lang === 'mermaid'` 분기, `LABELS`에 `mermaid: '구성도'`
- [ ] 데모 아이디어 n9rp에 `docs/data.md` 추가 (render로 만든 본문), design-prompt `sourceHash`를 data 본문 해시로
- [ ] 커밋

### Task 3: 확인 · 기록 · PR
- [ ] 검증 명령 4개
- [ ] 임시 `HATCH_DATA_DIR`로 dev 서버: 데모 상세에서 구성도 그림, 콘솔 오류 없음. 실제 생성 1회(`claude -p`)로 스키마 통과
- [ ] `hatch-reviewer`
- [ ] `docs/decisions/2026-10-30_데이터-구성-단계.md` + README 한 줄
- [ ] push · PR (closes #49)
