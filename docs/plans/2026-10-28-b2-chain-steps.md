# B-2. 나머지 5단계 실행 계획

> spec: [docs/specs/2026-10-28-b-doc-chain-design.md](../specs/2026-10-28-b-doc-chain-design.md) §3 · 이슈 #6 · 브랜치 `feat/6-chain-steps`
> 절차: `.claude/skills/chain-step/SKILL.md`. 패턴: `src/lib/chain/steps/plan.ts` · `plan.test.ts`

**Goal:** 기획안 다음 단계(개발 로드맵 → PRD → 기능명세 → 개발 프롬프트 / 디자인 프롬프트)를 상세 화면에서 차례로 만들 수 있다.

**Architecture:** B-1의 틀 그대로. 단계마다 `src/lib/prompts/chain/<key>.ts`(프롬프트 상수) + `src/lib/chain/steps/<key>.ts`(zod 스키마 · render) + `<key>.test.ts`. 등록은 `registry.ts`의 `CHAIN` 한 곳. 앞 단계(`from`)는 이미 storage `DOC_STEPS`에 있다.

**Tech Stack:** zod 4.6.7 · vitest. 새 패키지 없음

## Global Constraints

- 프롬프트 문자열은 `src/lib/prompts/`에만. 상수만 export (함수 없음). 파일 첫 줄 주석에 짝 스키마 이름
- 번호(R1, F1, 마일스톤 1.) · 개수 · 순서는 **코드가** 붙인다. AI 스키마에 id · 번호 칸을 두지 않는다
- 마크다운 형식은 render가 만든다. AI 출력 칸은 평서문 문자열 (CHAIN_RULES: 마크다운 문법 쓰지 않음)
- 표는 쓰지 않는다 (remark-gfm 없음). 목록 · 소제목(`###`)만
- 입력에 없는 사실은 `[확인 필요: ○○]` — 프롬프트마다 `openQuestions`(확인 필요) 칸을 둔다 (dev/design 제외)
- 프롬프트 본문을 담는 칸(dev-prompt · design-prompt의 `prompt`)은 render에서 `~~~text` 펜스로 감싼다 (본문에 ``` 가 있어도 안 깨지게)
- 단계 테스트는 plan.test.ts와 같은 4가지: 정상 통과 · 필수 칸 누락 실패 · `z.toJSONSchema` 가능 · render에 모든 `##` 제목과 코드가 붙인 번호 포함
- 커밋 `<type>(chain): 내용 (#6)` + 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## 병렬 규칙
Task 1~5는 **서로 다른 파일만** 만든다 → 동시에 진행. 이 Task들은 **커밋하지 않고** `registry.ts` · 공용 파일을 건드리지 않는다. Task 6이 등록 · 통합 테스트 · 커밋을 한 번에 한다.

---

### Task 1: 개발 로드맵 (`roadmap`, from plan)

**Files:** Create `src/lib/prompts/chain/roadmap.ts`, `src/lib/chain/steps/roadmap.ts`, `src/lib/chain/steps/roadmap.test.ts`
**Produces:** `roadmapStep: ChainStep<RoadmapOutput>`, `roadmapSchema`

```ts
export const roadmapSchema = z.object({
  overview: z.string().min(1),
  milestones: z
    .array(z.object({
      name: z.string().min(1),
      goal: z.string().min(1),
      scope: z.array(z.string()).min(1),
      doneWhen: z.array(z.string()).min(1),
    }))
    .min(2),
  outOfScope: z.array(z.string()),
  openQuestions: z.array(z.string()),
});
```
- render 제목: `## 개요` · `## 마일스톤` · `## 이번에 하지 않는 것` · `## 확인 필요`
- 마일스톤마다 `### {i+1}. {name}` (첫 번째만 뒤에 ` (MVP)`), 그 아래 `**목표** {goal}` · `**범위**` 목록 · `**완료 기준**` 목록
- 빈 목록은 `- 없음`
- 프롬프트 `ROADMAP_PROMPT`:
```
## 할 일
기획안을 개발 로드맵으로 나눈다. 첫 마일스톤은 가장 작게 출시할 수 있는 MVP다.
- overview: 로드맵 전체를 두세 문장으로
- milestones: 2~4개, 앞에서부터 출시 순서. 각각 name(짧은 이름) · goal(이 단계로 증명할 것) · scope(포함 기능) · doneWhen(완료 기준, 확인 가능한 문장)
- MVP에는 기획안의 핵심 가치를 증명하는 데 꼭 필요한 기능만 넣는다
- outOfScope: 기획안에 있지만 이번 로드맵에서 뺀 것과 이유
- openQuestions: 일정 · 인력 · 기술처럼 입력에 없는 것
- 기간 · 일정 수치는 지어내지 말고 [확인 필요]
```

### Task 2: PRD (`prd`, from roadmap, extra plan)

**Files:** Create `src/lib/prompts/chain/prd.ts`, `src/lib/chain/steps/prd.ts`, `src/lib/chain/steps/prd.test.ts`
**Produces:** `prdStep` (`extra: ['plan']`), `prdSchema`

```ts
export const prdSchema = z.object({
  background: z.string().min(1),
  goals: z.array(z.string()).min(1),
  nonGoals: z.array(z.string()),
  userStories: z.array(z.object({ as: z.string().min(1), want: z.string().min(1), soThat: z.string().min(1) })).min(1),
  requirements: z.array(z.object({ content: z.string().min(1), priority: z.enum(['P0', 'P1', 'P2']) })).min(1),
  metrics: z.array(z.string()).min(1),
  releaseScope: z.string().min(1),
  openQuestions: z.array(z.string()),
});
```
- render 제목: `## 배경` · `## 목표` · `## 비목표` · `## 사용자 스토리` · `## 요구사항` · `## 지표` · `## 출시 범위` · `## 확인 필요`
- 사용자 스토리: `- **{as}**로서 {want} — {soThat}`
- 요구사항: 코드가 `R{i+1}` 번호를 붙여 `- **R1** \`P0\` {content}`. 순서는 AI가 준 순서 그대로 (정렬하지 않음)
- 프롬프트 `PRD_PROMPT`:
```
## 할 일
개발 로드맵의 첫 마일스톤(MVP) 범위만 PRD로 쓴다. 기획안은 배경 이해에만 쓴다.
- background: 왜 지금 이 MVP를 만드는가
- goals / nonGoals: MVP가 이루려는 것 / 일부러 하지 않는 것
- userStories: as(사용자) · want(하고 싶은 것) · soThat(얻는 것)
- requirements: content(요구사항 한 문장) · priority(P0 꼭 필요 · P1 있으면 좋음 · P2 나중). 번호는 붙이지 않는다
- metrics: MVP 성공 판단 지표. 목표 수치는 [확인 필요]
- releaseScope: 출시에 포함되는 범위 한 문단
- openQuestions: 결정이 필요한 것
```

### Task 3: 기능명세 (`spec`, from prd)

**Files:** Create `src/lib/prompts/chain/spec.ts`, `src/lib/chain/steps/spec.ts`, `src/lib/chain/steps/spec.test.ts`
**Produces:** `specStep`, `specSchema`

```ts
export const specSchema = z.object({
  screens: z.array(z.object({
    name: z.string().min(1),
    purpose: z.string().min(1),
    elements: z.array(z.string()).min(1),
    actions: z.array(z.string()).min(1),
  })).min(1),
  functions: z.array(z.object({
    name: z.string().min(1),
    input: z.string().min(1),
    process: z.string().min(1),
    output: z.string().min(1),
    exceptions: z.array(z.string()),
  })).min(1),
  dataItems: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })),
  openQuestions: z.array(z.string()),
});
```
- render 제목: `## 화면` · `## 기능` · `## 데이터 항목` · `## 확인 필요`
- 화면: `### {name}` + `{purpose}` + `**구성 요소**` 목록 + `**동작**` 목록
- 기능: `### F{i+1}. {name}` + `- **입력** …` `- **처리** …` `- **출력** …` + `**예외**` 목록(`- 없음`)
- 데이터 항목: `- **{name}** — {description}`
- 프롬프트 `SPEC_PROMPT`:
```
## 할 일
PRD의 요구사항을 개발 · 디자인이 바로 쓸 수 있는 기능명세로 바꾼다.
- screens: 화면마다 name · purpose(이 화면에서 사용자가 하는 일) · elements(보이는 요소) · actions(사용자 동작과 결과)
- functions: 기능마다 name · input · process · output · exceptions(오류 · 빈 값 · 권한 등). 번호는 붙이지 않는다
- dataItems: 저장하거나 주고받는 데이터 항목 이름과 설명
- PRD의 모든 P0 요구사항이 화면이나 기능 어딘가에 드러나게 한다
- openQuestions: 정책 · 예외 처리 중 결정이 필요한 것
```

### Task 4: 개발 프롬프트 (`dev-prompt`, from spec)

**Files:** Create `src/lib/prompts/chain/dev-prompt.ts`, `src/lib/chain/steps/dev-prompt.ts`, `src/lib/chain/steps/dev-prompt.test.ts`
**Produces:** `devPromptStep`, `devPromptSchema`

```ts
export const devPromptSchema = z.object({
  prompt: z.string().min(1),
  assumptions: z.array(z.string()).min(1),
  steps: z.array(z.string()).min(1),
});
```
- render 제목: `## 프롬프트` · `## 기술 가정` · `## 작업 순서`
- `## 프롬프트` 아래 `~~~text\n{prompt}\n~~~`
- 작업 순서: 코드가 `1.` `2.` 번호
- 프롬프트 `DEV_PROMPT_PROMPT`:
```
## 할 일
기능명세를 코딩 에이전트(Claude Code 등)에게 그대로 붙여 넣을 개발 프롬프트로 바꾼다.
- prompt: 에이전트에게 주는 본문. 만들 것 · 화면 · 기능 · 데이터 · 예외 · 완료 기준을 빠짐없이. 테스트를 먼저 쓰라고 지시한다. 이 칸만은 줄바꿈과 "1)" 같은 번호를 써도 된다
- assumptions: 기능명세에 없어서 가정한 기술 선택 (언어 · 프레임워크 · 저장소). 각 줄 끝에 [확인 필요]
- steps: 에이전트가 작업할 순서 (작은 단위, 번호 없이)
```

### Task 5: 디자인 프롬프트 (`design-prompt`, from spec)

**Files:** Create `src/lib/prompts/chain/design-prompt.ts`, `src/lib/chain/steps/design-prompt.ts`, `src/lib/chain/steps/design-prompt.test.ts`
**Produces:** `designPromptStep`, `designPromptSchema`

```ts
export const designPromptSchema = z.object({
  prompt: z.string().min(1),
  screens: z.array(z.string()).min(1),
  tone: z.string().min(1),
  references: z.array(z.string()),
});
```
- render 제목: `## 프롬프트` · `## 화면 목록` · `## 톤` · `## 참고 패턴`
- `## 프롬프트` 아래 `~~~text\n{prompt}\n~~~`
- 빈 참고 패턴은 `- 없음`
- 프롬프트 `DESIGN_PROMPT_PROMPT`:
```
## 할 일
기능명세를 디자인 도구(Figma AI · v0 · Claude 등)에 그대로 붙여 넣을 디자인 프롬프트로 바꾼다.
- prompt: 화면마다 목적 · 구성 요소 · 상태(빈 화면 · 오류 · 로딩) · 주요 동작을 담은 본문. 이 칸만은 줄바꿈과 "1)" 같은 번호를 써도 된다
- screens: 그릴 화면 이름 목록
- tone: 시각 톤 한두 문장 (기능명세에 근거가 없으면 [확인 필요])
- references: 참고할 만한 일반 UI 패턴 이름 (특정 회사 디자인을 베끼라고 하지 않는다)
```

---

### Task 6: 등록 · 통합 테스트 · 커밋 (Task 1~5 뒤, 혼자)

**Files:** Modify `src/lib/chain/registry.ts`, `src/lib/chain/generate.test.ts`, `src/lib/chain/CLAUDE.md`
- [ ] `CHAIN`에 5단계 등록 (순서: roadmap · prd · spec · dev-prompt · design-prompt), 주석 "B-2에서…" 삭제
- [ ] generate.test.ts에 추가:
  - `GENERATABLE`이 `DOC_STEPS`의 6개 key와 같다
  - prd: roadmap만 있고 plan이 없으면 `'앞 문서를 먼저 만들어 주세요.'` (roadmap은 `saveDoc`으로 직접 저장)
  - prd: plan · roadmap이 모두 있으면 `FAKE_CLAUDE=ok`에서 `'결과 형식이 맞지 않아요'`로 끝난다 (입력 검사는 통과하고 claude까지 갔다는 뜻)
- [ ] `src/lib/chain/CLAUDE.md`에 단계 목록 최신화 (30줄 이하)
- [ ] `npm run lint && npm run typecheck && npm test && npm run build`
- [ ] 커밋 `feat(chain): 로드맵 · PRD · 기능명세 · 개발/디자인 프롬프트 단계 (#6)`

### Task 7: 실제 생성 확인 (컨트롤러)

- [ ] 임시 `HATCH_DATA_DIR`로 dev 서버 → 아이디어 하나로 기획안 → 로드맵 → PRD → 기능명세 → 개발 프롬프트 → 디자인 프롬프트 차례로 실제 claude 생성
- [ ] 각 문서가 스키마를 통과하고 화면에서 읽기 좋은지 (번호 · 펜스 · 소제목), 모음 배지가 마지막 단계로 바뀌는지
- [ ] 품질 문제(빈약 · 지어낸 수치 · 입력 무시)는 프롬프트만 고친다 → 다시 생성으로 확인
- [ ] `.env.local` · 임시 폴더 정리

### Task 8: 리뷰 · PR

- [ ] 브랜치 전체 리뷰(`hatch-reviewer` 체크리스트) → 지적 반영
- [ ] push → PR `feat(chain): B-2 나머지 5단계 (#6)` (closes #6, area:chain · type:feat, 마일스톤 B) → **머지는 사용자 승인 후**
