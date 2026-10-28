# Hatch

아이디어 한 줄 → 기획안 · 커리큘럼 · PRD · 기능명세 · 개발/디자인 프롬프트로 이어 주는 PO용 아이디어 뱅크.
Next.js(App Router) · Montage(원티드 디자인 시스템) · 생성은 로컬 Claude Code(`bridge/`).

## 지금 단계
**A 완료 (리뷰 중)** — 로컬 앱으로 쓰기 · 모음 · 상세, `~/Hatch` md 저장. 다음: B(문서 생성 체인 + bridge) spec.
실행: `cp .env.example .env.local` → `npm run dev`. Vercel에선 저장이 안 된다 (B에서 bridge로).

## 폴더 지도 — 일할 폴더의 CLAUDE.md를 먼저 읽는다
| 경로 | 역할 | 단계 | 에이전트 |
| --- | --- | --- | --- |
| `docs/` | spec · plan · Git 규칙 | 전체 | — |
| `src/app/` | 라우트 · 레이아웃 · 좌측 네비바 | A | `ui-builder` |
| `src/app/tools/` | PO 도구 공통 틀 + 도구 4종 | C | `tool-builder` |
| `src/components/` | 공용 UI (Montage 기반) | D | `ui-builder` |
| `src/lib/storage/` | 아이디어 · 문서 저장 | A | `ui-builder` |
| `src/lib/chain/` | 문서 생성 체인 단계 | B | `chain-author` |
| `src/lib/prompts/` | 프롬프트 문자열 (여기에만) | B · C | `chain-author` |
| `bridge/` | 맥 중계 서버 + Tailscale | B | `bridge-engineer` |

검사는 `hatch-reviewer`(읽기 전용). 스킬: `montage-ui` · `new-po-tool` · `chain-step` (`.claude/skills/`).

## 작업 흐름
spec(`docs/specs`) → plan(`docs/plans`) → 이슈 → 브랜치 → 구현 → `hatch-reviewer` → 검증 → PR → **사용자 승인 후** squash 머지.
Git 규칙 자세히: [docs/CLAUDE.md](docs/CLAUDE.md)

## 검증 (완료라고 말하기 전에 실제로 돌린다)
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
UI를 바꿨으면 dev 서버로 실제 흐름을 눌러 보고 콘솔 오류까지 확인한다. 테스트 데이터는 `.env.local`의 `HATCH_DATA_DIR`를 임시 폴더로.

## 공통 규칙
- Next.js 코드 쓰기 전 `node_modules/next/dist/docs/`에서 해당 가이드 확인 (AGENTS.md: 학습 데이터와 API가 다름)
- UI는 Montage 우선 → `montage-ui` 스킬. TDS는 화면 패턴 · 문구만 참고, 토큰 섞지 않음
- AI는 판단, 코드는 계산. AI 출력은 JSON 스키마로 받는다
- 패키지 매니저 npm. `@montage-ui/*` 는 같은 버전 고정
- 커밋 · PR · 이슈 · 화면 문구는 한국어

## 문서 분량
루트 60줄, 폴더 CLAUDE.md 30줄 이하. 넘으면 `docs/`로 빼고 링크만.
같은 절차를 손으로 3번 넘게 반복하면 스킬로 만든다.
