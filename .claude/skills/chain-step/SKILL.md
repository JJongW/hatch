---
name: chain-step
description: Hatch 문서 생성 체인(아이디어 → 기획안 → 개발 로드맵 → PRD → 기능명세 → 개발/디자인 프롬프트)에 단계 하나를 추가하거나 고칠 때 쓰는 절차.
---

# 체인 단계 하나 추가하기

패턴은 `src/lib/chain/steps/plan.ts` · `plan.test.ts`를 본다. 생성은 `src/lib/chain/generate.ts` → `src/lib/claude/run.ts`를 지난다.

## 전제
- 앞 단계가 이미 있다 (첫 단계는 아이디어가 입력)
- 이 단계의 이슈(`area:chain`)와 브랜치가 있다

## 순서
1. **입력 · 출력 정하기** — 입력은 앞 단계 출력 하나. 출력 JSON 스키마(zod)를 먼저 쓴다
2. **스키마 테스트** — `src/lib/chain/steps/<key>.test.ts`. 정상 예시 통과, 필수 칸 빠진 예시 실패, `render` 결과 확인
3. **프롬프트** — `src/lib/prompts/chain/<key>.ts`의 상수. 공통 상황 블록 재사용, 없는 사실은 `[확인 필요: ○○]`
4. **단계 파일** — `src/lib/chain/steps/<key>.ts`가 `ChainStep`을 export: zod `schema`, `prompt` 상수, `render`, 필요하면 `extra`
5. **연결** — `src/lib/chain/registry.ts`의 `CHAIN`에 등록. 앞 단계(`from`)는 storage의 `DOC_STEPS`에 둔다. 건너뛰기 없음
6. **실행 확인** — 상세 페이지에서 실제 아이디어 하나로 생성, 스키마 통과 확인
7. **검증** — `npm run lint && npm run typecheck && npm test && npm run build`
8. `hatch-reviewer` → PR

## 하지 말 것
- 단계 파일에 프롬프트 문장
- `generate.ts` / `src/lib/claude/run.ts`를 거치지 않는 직접 호출
