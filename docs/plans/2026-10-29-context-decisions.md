# 맥락 · 결정 기록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이디어에 프로젝트 맥락(4칸)과 결정 · 보류 기록을 저장하고, 기획안 생성 · 도구 실행 프롬프트에 넣어 다음 생성이 그걸 따르게 한다.

**Architecture:** 맥락은 `idea.md` 머리말(`context`), 결정은 `<id>/decisions.md` 머리말(`items`). `projectBlock(context, decisions)` 한 함수가 프롬프트 블록을 만들고, `ideaSource`(기획안 입력 · stale 해시)와 `runTool`(아이디어 문서로 실행할 때)이 같이 쓴다. 비어 있으면 블록이 빈 문자열이라 기존 입력 · 해시가 바뀌지 않는다.

**Tech Stack:** Next.js 16 App Router · React 19 `useActionState` · Montage UI · gray-matter · vitest

**Spec:** `docs/specs/2026-10-29-context-decisions-design.md` · **PR:** Part 1 = #43 (Task 1–4, 브랜치 `feat/43-project-context`) · Part 2 = #44 (Task 5–9, 브랜치 `feat/44-decisions`, Part 1 머지 후 main에서)

## Global Constraints
- 맥락 칸: `customer` 목표 고객 · `goal` 목표 지표 · `constraints` 제약 · `facts` 이미 아는 사실. 칸당 최대 1,000자, 넘으면 `StorageError('맥락 칸은 1,000자까지예요.')`
- `IDEA_FILE_VERSION` = 2. 1판(머리말에 `context` 없음)은 빈 맥락으로 읽는다
- 결정 한도: 질문 200자 · 답 500자 · 이유 500자. 이유는 필수, 정함이면 답 필수, 보류면 답 ''
- 맥락 · 결정이 모두 비면 `ideaSource`는 지금(`# 제목\n\n메모`.trim())과 바이트까지 같다
- 프롬프트 문자열(블록 제목 · 규칙 줄)은 `src/lib/prompts/context.ts`에만
- 화면 컴포넌트는 `@/lib/storage`를 값으로 import하지 않는다 (type import만). 값은 페이지가 props로 넘긴다
- 데모(`useDemo()` / `isDemo()`)에서는 저장 버튼 · 폼이 없다. Server Action도 `DEMO_MESSAGE`로 거부
- 문서 생성 중(`generating`)에는 맥락 · 결정 폼의 제출 버튼을 `disabled`
- 화면 문구 · 커밋은 한국어. 커밋 `<type>(bank): 내용 (#이슈)` + 마지막 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

---

# Part 1 — 맥락 (#43)

### Task 1: 맥락 저장 · 프롬프트 블록

**Files:**
- Modify: `src/lib/storage/types.ts` · `src/lib/storage/ideas.ts` · `src/lib/storage/docs.ts` · `src/lib/storage/index.ts` · `src/lib/prompts/context.ts`
- Test: `src/lib/storage/ideas.test.ts` · `src/lib/storage/docs.test.ts`

**Interfaces:**
- Produces: `type IdeaContext = { customer: string; goal: string; constraints: string; facts: string }` · `Idea.context: IdeaContext` · `CONTEXT_FIELDS: ReadonlyArray<{ key: keyof IdeaContext; label: string }>` · `EMPTY_CONTEXT` · `CONTEXT_MAX = 1000` · `updateIdeaContext(id: string, ctx: IdeaContext): Promise<Idea>` · `projectBlock(context: IdeaContext): string` · `ideaSource(idea: Pick<Idea, 'title' | 'memo' | 'context'>): string` · prompts `PROJECT_BLOCK = { context: '### 프로젝트 맥락' }`

- [ ] **Step 1: 실패하는 테스트**

`src/lib/storage/ideas.test.ts` 끝에 추가 (import에 `updateIdeaContext` 추가):
```ts
describe('맥락', () => {
  it('새 아이디어는 빈 맥락, 저장하면 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(idea.context).toEqual({ customer: '', goal: '', constraints: '', facts: '' });
    await updateIdeaContext(idea.id, { customer: '  직장인  ', goal: '예약 전환율', constraints: '', facts: '' });
    const read = await getIdea(idea.id);
    expect(read?.context).toEqual({ customer: '직장인', goal: '예약 전환율', constraints: '', facts: '' });
    expect(read?.title).toBe('x');
  });
  it('1판 idea.md(context 없음)는 빈 맥락으로 읽는다', async () => {
    const id = '20261029-0900-abcd';
    await fs.mkdir(path.join(dir, 'ideas', id), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'ideas', id, 'idea.md'),
      "---\nid: 20261029-0900-abcd\ntitle: 옛 아이디어\ncreatedAt: '2026-10-29T00:00:00.000Z'\nupdatedAt: '2026-10-29T00:00:00.000Z'\nversion: 1\n---\n메모\n",
    );
    expect((await getIdea(id))?.context).toEqual({ customer: '', goal: '', constraints: '', facts: '' });
  });
  it('1,000자 넘는 칸은 거부', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(
      updateIdeaContext(idea.id, { customer: 'a'.repeat(1001), goal: '', constraints: '', facts: '' }),
    ).rejects.toThrow('맥락 칸은 1,000자까지예요.');
  });
  it('제목 · 메모를 고쳐도 맥락은 그대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await updateIdeaContext(idea.id, { customer: '직장인', goal: '', constraints: '', facts: '' });
    await updateIdea(idea.id, { memo: '새 메모' });
    expect((await getIdea(idea.id))?.context.customer).toBe('직장인');
  });
});
```

`src/lib/storage/docs.test.ts` 끝에 추가 (import에 `projectBlock`, `updateIdeaContext`, `EMPTY_CONTEXT` 추가):
```ts
describe('ideaSource · projectBlock', () => {
  it('맥락이 비면 지금 형식과 같다', () => {
    expect(ideaSource({ title: '동네 클래스', memo: '주말', context: EMPTY_CONTEXT })).toBe('# 동네 클래스\n\n주말');
    expect(projectBlock(EMPTY_CONTEXT)).toBe('');
  });
  it('채운 칸만, 정해진 순서로, 줄바꿈은 한 칸 공백으로', () => {
    const ctx = { customer: '', goal: '예약\n전환율', constraints: '', facts: '조사 3건' };
    expect(projectBlock(ctx)).toBe('### 프로젝트 맥락\n- 목표 지표: 예약 전환율\n- 이미 아는 사실: 조사 3건');
    expect(ideaSource({ title: 't', memo: 'm', context: ctx })).toBe(`# t\n\nm\n\n${projectBlock(ctx)}`);
  });
  it('맥락을 바꾸면 기획안이 stale', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    expect((await getDocs(idea.id))[0].stale).toBe(false);
    await updateIdeaContext(idea.id, { customer: '직장인', goal: '', constraints: '', facts: '' });
    expect((await getDocs(idea.id))[0].stale).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/storage` → `updateIdeaContext` · `projectBlock` 없음으로 FAIL

- [ ] **Step 3: 구현**

`src/lib/prompts/context.ts` 끝에:
```ts
/** 아이디어 맥락 · 결정 블록 제목 (기획안 입력과 도구 입력에 같이 붙는다) */
export const PROJECT_BLOCK = {
  context: '### 프로젝트 맥락',
} as const;
```

`src/lib/storage/types.ts` — `Idea`에 `context: IdeaContext;` 추가, 아래 추가, `IDEA_FILE_VERSION = 2`:
```ts
export type IdeaContext = { customer: string; goal: string; constraints: string; facts: string };

/** 맥락 칸 순서 · 이름. 화면과 프롬프트 블록이 같이 쓴다 */
export const CONTEXT_FIELDS: ReadonlyArray<{ key: keyof IdeaContext; label: string }> = [
  { key: 'customer', label: '목표 고객' },
  { key: 'goal', label: '목표 지표' },
  { key: 'constraints', label: '제약' },
  { key: 'facts', label: '이미 아는 사실' },
];

export const EMPTY_CONTEXT: IdeaContext = { customer: '', goal: '', constraints: '', facts: '' };
export const CONTEXT_MAX = 1000;
```
`IDEA_FILE_VERSION` 주석에 `// 2: context 머리말 추가 (1판은 빈 맥락으로 읽음)` 한 줄.

`src/lib/storage/ideas.ts`:
```ts
// import에 CONTEXT_FIELDS, CONTEXT_MAX, EMPTY_CONTEXT, type IdeaContext 추가

/** 머리말 context → 네 칸 문자열. 없거나 깨진 칸은 '' (1판 호환) */
function readContext(raw: unknown): IdeaContext {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    CONTEXT_FIELDS.map((f) => [f.key, typeof obj[f.key] === 'string' ? (obj[f.key] as string) : '']),
  ) as IdeaContext;
}
```
- `readIdea` 반환에 `context: readContext(data.context)` 추가
- `createIdea`의 `idea`에 `context: EMPTY_CONTEXT` 추가
- `writeIdea`는 그대로 (`front`에 `context`가 들어간다)
- 새 함수:
```ts
export async function updateIdeaContext(id: string, ctx: IdeaContext): Promise<Idea> {
  const current = await getIdea(id);
  if (!current) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const context = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, (ctx[f.key] ?? '').trim()])) as IdeaContext;
  if (Object.values(context).some((v) => v.length > CONTEXT_MAX)) throw new StorageError('맥락 칸은 1,000자까지예요.');
  const next: Idea = { ...current, context, updatedAt: new Date().toISOString() };
  await writeIdea(next);
  return next;
}
```

`src/lib/storage/docs.ts` — `ideaSource` 교체 (import에 `PROJECT_BLOCK` from `@/lib/prompts/context`, `CONTEXT_FIELDS`, `type IdeaContext`):
```ts
const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');

/** 맥락 블록. 채운 칸이 없으면 '' — 그래야 맥락 없는 아이디어의 입력 · 해시가 그대로다 */
export function projectBlock(context: IdeaContext): string {
  const lines = CONTEXT_FIELDS.filter((f) => context[f.key].trim()).map((f) => `- ${f.label}: ${oneLine(context[f.key])}`);
  return lines.length ? `${PROJECT_BLOCK.context}\n${lines.join('\n')}` : '';
}

export const ideaSource = (idea: Pick<Idea, 'title' | 'memo' | 'context'>) =>
  [`# ${idea.title}\n\n${idea.memo}`.trim(), projectBlock(idea.context)].filter(Boolean).join('\n\n');
```

`src/lib/storage/index.ts` — ideas export에 `updateIdeaContext`, docs export에 `projectBlock`, types export에 `CONTEXT_FIELDS, CONTEXT_MAX, EMPTY_CONTEXT, type IdeaContext` 추가.

- [ ] **Step 4: 통과 확인** — `npx vitest run src/lib/storage` PASS · `npm run typecheck` (다른 곳에서 `Idea`를 만드는 코드가 있으면 `context`가 없다고 나온다 → `grep -rn "createdAt:" src --include='*.ts*'`로 찾아 `context: EMPTY_CONTEXT` 추가)

- [ ] **Step 5: 커밋**
```bash
git add src/lib/storage src/lib/prompts/context.ts
git commit -m "feat(bank): 아이디어 맥락 저장 · 프롬프트 블록 (#43)"
```

---

### Task 2: 도구 실행에 맥락 블록

**Files:**
- Modify: `src/lib/tools/run.ts`
- Test: `src/lib/tools/run.test.ts`

**Interfaces:**
- Consumes: `getIdea(id)` · `projectBlock(context)` (Task 1, `@/lib/storage`)

- [ ] **Step 1: 실패하는 테스트** — `run.test.ts`의 `describe('runTool')` 안에 추가 (import에 `updateIdeaContext` 추가):
```ts
it('아이디어 문서로 실행하면 맥락 블록을 입력 문서 다음에 붙인다', async () => {
  const idea = await createIdea({ title: 'x', memo: '' });
  await saveDoc(idea.id, 'prd', 'PRD 본문', { sourceHash: hashOf('x') });
  await updateIdeaContext(idea.id, { customer: '직장인', goal: '', constraints: '', facts: '' });
  const { resultId } = await runTool(echoTool, { source: { ideaId: idea.id, docKey: 'prd' }, input: { note: 'hi' } });
  const prompt = ((await getToolResult(idea.id, resultId))?.data as { echo: string }).echo;
  expect(prompt).toContain('### 프로젝트 맥락\n- 목표 고객: 직장인');
  expect(prompt.indexOf('PRD 본문')).toBeLessThan(prompt.indexOf('### 프로젝트 맥락'));
  expect(prompt.indexOf('### 프로젝트 맥락')).toBeLessThan(prompt.indexOf('### 메모'));
});
it('붙여넣기 실행에는 맥락 블록이 없다', async () => {
  const { resultId } = await runTool(echoTool, { source: { pasted: '회사 PRD' }, input: {} });
  const prompt = ((await getToolResult(null, resultId))?.data as { echo: string }).echo;
  expect(prompt).not.toContain('### 프로젝트 맥락');
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/tools/run.test.ts` → 첫 테스트 FAIL

- [ ] **Step 3: 구현** — `run.ts` import에 `getIdea, projectBlock` 추가. `if (isClaudeBusy())` 줄 앞에:
```ts
  // 아이디어 문서로 실행할 때만 그 아이디어의 맥락을 같이 넘긴다 (붙여넣기 · 문서 없이는 없음)
  const idea = ideaId ? await getIdea(ideaId) : null;
  const project = idea ? projectBlock(idea.context) : '';
```
`prompt` 배열을 `[TOOL_RULES, tool.prompt, INPUT_HEADING, text && \`${SOURCE_HEADING}\n${text}\`, project, tool.promptInput(parsed.data, prev)]`로.

- [ ] **Step 4: 통과 확인** — `npx vitest run src/lib/tools` PASS

- [ ] **Step 5: 커밋**
```bash
git add src/lib/tools/run.ts src/lib/tools/run.test.ts
git commit -m "feat(tools): 아이디어 문서로 실행하면 맥락을 같이 넘긴다 (#43)"
```

---

### Task 3: 상세 화면 "프로젝트 맥락" 칸

**Files:**
- Create: `src/app/ideas/[id]/context-panel.tsx`
- Modify: `src/app/actions.ts` · `src/app/ideas/[id]/page.tsx` · `src/app/ideas/[id]/idea-detail.tsx`

**Interfaces:**
- Consumes: `updateIdeaContext` · `CONTEXT_FIELDS` · `type IdeaContext` (Task 1)
- Produces: `type ContextState = { error?: string; values?: IdeaContext; savedAt?: number }` · `saveContextAction(id: string, prev: ContextState, formData: FormData): Promise<ContextState>`

- [ ] **Step 1: Server Action** — `src/app/actions.ts`. storage import에 `CONTEXT_FIELDS, updateIdeaContext, type IdeaContext` 추가, `updateIdeaAction` 아래에:
```ts
export type ContextState = { error?: string; values?: IdeaContext; savedAt?: number };

export async function saveContextAction(id: string, _prev: ContextState, formData: FormData): Promise<ContextState> {
  const values = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, String(formData.get(f.key) ?? '')])) as IdeaContext;
  if (isDemo()) return { error: DEMO_MESSAGE, values };
  try {
    await updateIdeaContext(id, values);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}
```

- [ ] **Step 2: 칸 컴포넌트** — `src/app/ideas/[id]/context-panel.tsx`:
```tsx
'use client';

import { useActionState, useState } from 'react';
import { Box, Button, FlexBox, SectionMessage, TextArea, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import SectionTitle from '../../_components/section-title';

import type { IdeaContext } from '@/lib/storage';
import type { ContextState } from '../../actions';

type Props = {
  context: IdeaContext;
  /** 칸 순서 · 이름 (storage의 CONTEXT_FIELDS를 페이지가 넘긴다) */
  fields: ReadonlyArray<{ key: keyof IdeaContext; label: string }>;
  action: (prev: ContextState, formData: FormData) => Promise<ContextState>;
  /** 문서 생성 중이면 저장을 막는다 */
  disabled: boolean;
};

const PLACEHOLDER: Record<keyof IdeaContext, string> = {
  customer: '누구의 문제를 푸나요?',
  goal: '무엇이 움직이면 성공인가요?',
  constraints: '일정 · 인력 · 정책처럼 넘으면 안 되는 선',
  facts: '조사 · 데이터로 확인한 것',
};

export default function ContextPanel({ context, fields, action, disabled }: Props) {
  const demo = useDemo();
  const [editing, setEditing] = useState(false);
  // 저장에 성공하면 읽기로 돌아간다
  const save = async (prev: ContextState, fd: FormData) => {
    const next = await action(prev, fd);
    if (!next.error) setEditing(false);
    return next;
  };
  const [state, formAction, pending] = useActionState(save, {});
  const filled = fields.filter((f) => context[f.key]);

  if (editing) {
    const values = state.values ?? context;
    return (
      <Box>
        <SectionTitle>프로젝트 맥락</SectionTitle>
        <form action={formAction}>
          <FlexBox flexDirection="column" gap="12px">
            {fields.map((f) => (
              <FlexBox key={f.key} flexDirection="column" gap="4px">
                <Typography as="label" htmlFor={`ctx-${f.key}`} variant="label1" weight="bold">
                  {f.label}
                </Typography>
                <TextArea id={`ctx-${f.key}`} name={f.key} defaultValue={values[f.key]} placeholder={PLACEHOLDER[f.key]} minRows={2} width="100%" />
              </FlexBox>
            ))}
            {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
            <FlexBox justifyContent="flex-end" gap="8px">
              <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button type="submit" size="small" loading={pending} disabled={disabled}>
                맥락 저장
              </Button>
            </FlexBox>
          </FlexBox>
        </form>
      </Box>
    );
  }

  return (
    <Box>
      <FlexBox justifyContent="space-between" alignItems="center" gap="12px">
        <SectionTitle>프로젝트 맥락</SectionTitle>
        {!demo && filled.length > 0 && (
          <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(true)} disabled={disabled}>
            수정
          </Button>
        )}
      </FlexBox>
      {filled.length > 0 ? (
        <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
          {filled.map((f) => (
            <li key={f.key}>
              {f.label}: {context[f.key]}
            </li>
          ))}
        </Typography>
      ) : (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          <Typography as="p" variant="body2" color="semantic.foreground.neutral.secondary">
            {demo ? '아직 적은 맥락이 없어요.' : '적어 두면 모든 문서와 도구에 같이 들어가요.'}
          </Typography>
          {!demo && (
            <Button size="small" onClick={() => setEditing(true)} disabled={disabled}>
              맥락 적기
            </Button>
          )}
        </FlexBox>
      )}
    </Box>
  );
}
```
- `SectionTitle`의 위 여백(40px)이 머리 바로 아래라 크면 `SectionTitle`은 그대로 두고 화면에서 확인만 한다 (Step 5)
- `Typography`의 `htmlFor`가 타입 오류면 `<label htmlFor=…><Typography as="span" …>` 로 감싼다

- [ ] **Step 3: 페이지 · 상세 연결**

`page.tsx`: storage import에 `CONTEXT_FIELDS`, actions import에 `saveContextAction`. `<IdeaDetail>`에 props 추가:
```tsx
      context={idea.context}
      contextFields={CONTEXT_FIELDS}
      saveContextAction={saveContextAction.bind(null, id)}
```
`idea-detail.tsx`: `Props`에 추가
```ts
  context: IdeaContext;
  contextFields: ReadonlyArray<{ key: keyof IdeaContext; label: string }>;
  saveContextAction: (prev: ContextState, formData: FormData) => Promise<ContextState>;
```
(type import에 `IdeaContext` from `@/lib/storage`, `ContextState` from `../../actions`). 구조 분해에 세 개 추가. `<IdeaSummary …/>` 바로 위에:
```tsx
      <ContextPanel context={context} fields={contextFields} action={saveContextAction} disabled={generating} />
```
`import ContextPanel from './context-panel';`

- [ ] **Step 4: 검사** — `npm run lint && npm run typecheck && npm test`

- [ ] **Step 5: 화면 확인 (컨트롤러가 직접)** — `hatch-temp`(포트 3111, 임시 데이터) dev 서버로:
  1. 맥락 없는 아이디어 → "적어 두면…" + "맥락 적기" → 2칸 입력 → 저장 → 읽기 목록에 2줄
  2. 기획안이 있던 아이디어면 기획안 탭에 "앞 문서가 바뀜" 상태 · 추천 다음 행동이 "기획안 확인하기"
  3. "수정" → 1,001자 붙여넣기 → 저장 → "맥락 칸은 1,000자까지예요." · 입력 유지
  4. 콘솔 오류 없음

- [ ] **Step 6: 커밋**
```bash
git add src/app/actions.ts "src/app/ideas/[id]"
git commit -m "feat(bank): 상세 화면에 프로젝트 맥락 칸 (#43)"
```

---

### Task 4: 데모 샘플 · 문서 · 기록 (Part 1 마무리)

**Files:**
- Modify: `demo-data/ideas/20261028-1441-n9rp/idea.md` · `src/lib/storage/CLAUDE.md` · `docs/ai-usage/prompts.md` · `docs/decisions/README.md`
- Create: `docs/decisions/2026-10-29_프로젝트-맥락.md`

- [ ] **Step 1: 데모 샘플** — `idea.md` 머리말을 아래로 (본문 메모는 그대로):
```yaml
---
id: 20261028-1441-n9rp
title: 동네 원데이 클래스 추천
createdAt: '2026-10-28T05:41:06.535Z'
updatedAt: '2026-10-29T09:00:00.000Z'
context:
  customer: 퇴근 후 1~2시간 취미를 찾는 20~30대 직장인
  goal: 추천 클릭 후 예약 전환율
  constraints: ''
  facts: ''
version: 2
---
```
- [ ] **Step 2: storage CLAUDE.md** — "저장 형식"의 idea.md 설명을 `idea.md` (머리말 + 메모, 머리말 `context` = 맥락 4칸 · 2판)로
- [ ] **Step 3: prompts.md §5** — 표/목록 형식 그대로 한 줄: `2026-10-29 · 기획안 입력 · 도구 입력(아이디어 문서) 뒤에 "### 프로젝트 맥락" 블록 (채운 칸만, 비면 없음) · #43`
- [ ] **Step 4: why 기록** — `why` 스킬 형식으로 `docs/decisions/2026-10-29_프로젝트-맥락.md` (What: 목표 고객 · 지표 · 제약 · 아는 사실을 한 번 적으면 기획안과 도구가 같이 본다 / Why: 문서 · 도구마다 같은 배경을 다시 설명해야 했다 · 피드백 2 / 판단 근거: 칸을 4개로 고정해 VOC "순위를 정하기 전에 볼 것"(고객군 · 목표 · 비용)과 맞춤, 비어 있으면 기존 문서가 바뀌지 않게). `README.md` 표에 한 줄
- [ ] **Step 5: 검증 · 데모 확인** — `npm run lint && npm run typecheck && npm test && npm run build` → `hatch-demo`(3110)에서 n9rp 상세: 맥락 2줄 · 버튼 없음 · 기획안 "앞 문서가 바뀜"(의도) · 콘솔 오류 없음
- [ ] **Step 6: 커밋**
```bash
git add demo-data src/lib/storage/CLAUDE.md docs
git commit -m "docs(bank): 맥락 데모 샘플 · why 기록 (#43)"
```
→ `hatch-reviewer` → PR #43 → 사용자 승인 후 squash 머지

---

# Part 2 — 결정 (#44)

Part 1 머지 후 `git switch main && git pull && git switch -c feat/44-decisions`.

### Task 5: 결정 저장

**Files:**
- Create: `src/lib/storage/history.ts` · `src/lib/storage/decisions.ts` · `src/lib/storage/decisions.test.ts`
- Modify: `src/lib/storage/types.ts` · `src/lib/storage/docs.ts` · `src/lib/storage/index.ts`

**Interfaces:**
- Produces: `type Decision = { id: string; question: string; status: 'decided' | 'deferred'; answer: string; reason: string; from: 'plan' | 'manual'; decidedAt: string }` · `type DecisionInput = Pick<Decision, 'question' | 'status' | 'answer' | 'reason' | 'from'>` · `listDecisions(id): Promise<Decision[]>` · `saveDecision(id, input: DecisionInput, decisionId?: string): Promise<Decision>` · `removeDecision(id, decisionId): Promise<void>` · `keepHistory(id: string, from: string, name: string): Promise<void>` (storage 안에서만)

- [ ] **Step 1: 실패하는 테스트** — `src/lib/storage/decisions.test.ts`:
```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, listDecisions, removeDecision, saveDecision } from '.';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const decided = { question: ' 첫 출시 지역은? ', status: 'decided' as const, answer: '성수동', reason: '공방이 많다', from: 'plan' as const };

describe('결정', () => {
  it('파일이 없으면 빈 목록, 저장하면 다듬어서 순서대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(await listDecisions(idea.id)).toEqual([]);
    const a = await saveDecision(idea.id, decided);
    const b = await saveDecision(idea.id, { question: '결제는?', status: 'deferred', answer: '무시됨', reason: '파트너 미정', from: 'manual' });
    expect(a).toMatchObject({ question: '첫 출시 지역은?', status: 'decided', answer: '성수동', from: 'plan' });
    expect(b.answer).toBe('');
    expect((await listDecisions(idea.id)).map((d) => d.id)).toEqual([a.id, b.id]);
  });
  it('입력 검사', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(saveDecision(idea.id, { ...decided, question: ' ' })).rejects.toThrow('정할 것을 적어 주세요.');
    await expect(saveDecision(idea.id, { ...decided, answer: '' })).rejects.toThrow('고른 답을 적어 주세요.');
    await expect(saveDecision(idea.id, { ...decided, reason: '' })).rejects.toThrow('이유를 적어 주세요.');
    await expect(saveDecision(idea.id, { ...decided, question: 'a'.repeat(201) })).rejects.toThrow('정할 것은 200자, 답 · 이유는 500자까지예요.');
    await expect(saveDecision(idea.id, { ...decided, reason: 'a'.repeat(501) })).rejects.toThrow('정할 것은 200자, 답 · 이유는 500자까지예요.');
    await expect(saveDecision(idea.id, { ...decided, status: 'x' as 'decided' })).rejects.toThrow('정함 · 보류 중 하나를 골라 주세요.');
  });
  it('수정하면 내용 · 시각이 바뀌고 출처 · id는 그대로, 이전 판은 .history에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveDecision(idea.id, decided);
    const b = await saveDecision(idea.id, { ...decided, answer: '망원동', from: 'manual' }, a.id);
    expect(b).toMatchObject({ id: a.id, answer: '망원동', from: 'plan' });
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('decisions-'))).toBe(true);
    await expect(saveDecision(idea.id, decided, 'zzzz')).rejects.toThrow('결정을 찾을 수 없어요. 새로고침해 주세요.');
  });
  it('지우면 목록에서 빠진다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveDecision(idea.id, decided);
    await removeDecision(idea.id, a.id);
    expect(await listDecisions(idea.id)).toEqual([]);
  });
  it('깨진 항목은 건너뛰고, 깨진 파일은 빈 목록', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'decisions.md');
    await fs.writeFile(file, "---\nitems:\n  - id: ab12\n    question: 지역\n    status: decided\n    answer: 성수\n    reason: 많다\n    from: plan\n    decidedAt: '2026-10-29T00:00:00.000Z'\n  - id: 1\n    question: 깨짐\n---\n");
    expect((await listDecisions(idea.id)).map((d) => d.question)).toEqual(['지역']);
    await fs.writeFile(file, '---\nitems: [\n---\n');
    expect(await listDecisions(idea.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/storage/decisions.test.ts` → import 실패로 FAIL

- [ ] **Step 3: 구현**

`types.ts` 끝에:
```ts
export type Decision = {
  /** 4자 랜덤 (목록 안에서만 유일) */
  id: string;
  question: string;
  status: 'decided' | 'deferred';
  /** 보류면 '' */
  answer: string;
  reason: string;
  /** 기획안 질문에 답함 / 직접 추가 */
  from: 'plan' | 'manual';
  /** ISO 8601, 고칠 때 갱신 */
  decidedAt: string;
};
export type DecisionInput = Pick<Decision, 'question' | 'status' | 'answer' | 'reason' | 'from'>;
export const DECISION_FILE_VERSION = 1;
```

`history.ts` — `docs.ts`의 `keepHistory` · `stamp`를 옮겨 일반화:
```ts
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ideaDir } from './paths';

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); // 20261028T091500

/** 덮어쓰기 전에 이전 판을 `<id>/.history/<name>-<시각>-<rand>.md`로 (지우지 않는다) */
export async function keepHistory(id: string, from: string, name: string) {
  const exists = await fs.stat(from).then(() => true, () => false);
  if (!exists) return;
  const dir = path.join(ideaDir(id), '.history');
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(from, path.join(dir, `${name}-${stamp()}-${crypto.randomBytes(2).toString('hex')}.md`));
}
```
`docs.ts`: 기존 `stamp` · `keepHistory` 삭제, `import { keepHistory } from './history';`, 호출 2곳을 `await keepHistory(id, docPath(id, key), key);`로 (`crypto` import는 `hashOf`가 계속 쓴다).

`decisions.ts`:
```ts
import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { DECISION_FILE_VERSION, type Decision, type DecisionInput } from './types';

const LIMIT = { question: 200, answer: 500, reason: 500 };
const file = (id: string) => path.join(ideaDir(id), 'decisions.md');
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v); // 손으로 고친 날짜는 YAML Date

function isDecision(v: unknown): v is Decision {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Record<string, unknown>;
  return (
    ['id', 'question', 'answer', 'reason', 'decidedAt'].every((k) => typeof d[k] === 'string') &&
    (d.status === 'decided' || d.status === 'deferred') &&
    (d.from === 'plan' || d.from === 'manual')
  );
}

/** 파일이 없거나 깨졌으면 빈 목록, 깨진 항목은 건너뛴다 */
export async function listDecisions(id: string): Promise<Decision[]> {
  assertValidId(id);
  let raw: string;
  try {
    raw = await fs.readFile(file(id), 'utf8');
  } catch (e) {
    if (isMissing(e)) return [];
    throw e;
  }
  try {
    const items: unknown = matter(raw).data.items;
    if (!Array.isArray(items)) return [];
    return items.map((it) => (typeof it === 'object' && it ? { ...it, decidedAt: iso((it as Decision).decidedAt) } : it)).filter(isDecision);
  } catch {
    return [];
  }
}

function clean(input: DecisionInput): DecisionInput {
  if (input.status !== 'decided' && input.status !== 'deferred') throw new StorageError('정함 · 보류 중 하나를 골라 주세요.');
  const question = input.question.trim();
  const answer = input.status === 'decided' ? input.answer.trim() : '';
  const reason = input.reason.trim();
  if (!question) throw new StorageError('정할 것을 적어 주세요.');
  if (input.status === 'decided' && !answer) throw new StorageError('고른 답을 적어 주세요.');
  if (!reason) throw new StorageError('이유를 적어 주세요.');
  if (question.length > LIMIT.question || answer.length > LIMIT.answer || reason.length > LIMIT.reason) {
    throw new StorageError('정할 것은 200자, 답 · 이유는 500자까지예요.');
  }
  return { question, status: input.status, answer, reason, from: input.from === 'plan' ? 'plan' : 'manual' };
}

async function write(id: string, items: Decision[]) {
  await keepHistory(id, file(id), 'decisions');
  await fs.writeFile(file(id), matter.stringify('', { version: DECISION_FILE_VERSION, items }));
}

/** decisionId가 있으면 그 결정을 고친다 (출처 · id는 그대로) */
export async function saveDecision(id: string, input: DecisionInput, decisionId?: string): Promise<Decision> {
  if (!(await getIdea(id))) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const c = clean(input);
  const items = await listDecisions(id);
  const decidedAt = new Date().toISOString();
  let saved: Decision;
  if (decisionId) {
    const i = items.findIndex((d) => d.id === decisionId);
    if (i < 0) throw new StorageError('결정을 찾을 수 없어요. 새로고침해 주세요.');
    saved = { ...items[i], ...c, from: items[i].from, decidedAt };
    items[i] = saved;
  } else {
    let newId: string;
    do {
      newId = crypto.randomBytes(2).toString('hex');
    } while (items.some((d) => d.id === newId));
    saved = { id: newId, ...c, decidedAt };
    items.push(saved);
  }
  await write(id, items);
  return saved;
}

/** 목록에서 뺀다. 이전 판은 .history에 남는다 */
export async function removeDecision(id: string, decisionId: string): Promise<void> {
  const items = await listDecisions(id);
  const next = items.filter((d) => d.id !== decisionId);
  if (next.length === items.length) return;
  await write(id, next);
}
```
`index.ts`: `export { listDecisions, removeDecision, saveDecision } from './decisions';` · types export에 `type Decision, type DecisionInput`.

- [ ] **Step 4: 통과 확인** — `npx vitest run src/lib/storage` PASS (docs 테스트의 .history 기대도 그대로 통과해야 한다)

- [ ] **Step 5: 커밋**
```bash
git add src/lib/storage
git commit -m "feat(bank): 결정 · 보류 기록 저장 (#44)"
```

---

### Task 6: 결정을 생성에 반영

**Files:**
- Modify: `src/lib/prompts/context.ts` · `src/lib/storage/docs.ts` · `src/lib/chain/generate.ts` · `src/lib/tools/run.ts`
- Test: `src/lib/storage/docs.test.ts` · `src/lib/tools/run.test.ts`

**Interfaces:**
- Consumes: `listDecisions` · `saveDecision` · `type Decision` (Task 5)
- Produces: `projectBlock(context: IdeaContext, decisions?: Decision[]): string` · `ideaSource(idea, decisions?: Decision[]): string` (둘 다 `decisions` 기본값 `[]`)

- [ ] **Step 1: 실패하는 테스트**

`docs.test.ts`의 `describe('ideaSource · projectBlock')` 안에 (import에 `saveDecision`, `type Decision` from `./types`):
```ts
  const d = (over: Partial<Decision>): Decision => ({
    id: 'ab12', question: '지역은?', status: 'decided', answer: '성수동', reason: '공방이 많다', from: 'plan', decidedAt: '2026-10-29T00:00:00.000Z', ...over,
  });
  it('정한 것 · 보류한 것 블록, 맥락 다음 순서', () => {
    const block = projectBlock({ ...EMPTY_CONTEXT, customer: '직장인' }, [
      d({}),
      d({ id: 'cd34', question: '결제는?', status: 'deferred', answer: '', reason: '파트너 미정' }),
    ]);
    expect(block).toBe(
      '### 프로젝트 맥락\n- 목표 고객: 직장인\n\n### 정한 것\n- 지역은? → 성수동 (이유: 공방이 많다)\n\n### 보류한 것\n- 결제는? (보류 이유: 파트너 미정)',
    );
    expect(projectBlock(EMPTY_CONTEXT, [])).toBe('');
  });
  it('결정을 남기면 기획안이 stale', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '기획', { sourceHash: hashOf(ideaSource(idea)) });
    await saveDecision(idea.id, { question: '지역은?', status: 'decided', answer: '성수동', reason: '많다', from: 'plan' });
    expect((await getDocs(idea.id))[0].stale).toBe(true);
  });
```
`run.test.ts`에 (import에 `saveDecision`):
```ts
it('아이디어 문서로 실행하면 정한 것도 같이 넘긴다', async () => {
  const idea = await createIdea({ title: 'x', memo: '' });
  await saveDoc(idea.id, 'prd', 'PRD 본문', { sourceHash: hashOf('x') });
  await saveDecision(idea.id, { question: '지역은?', status: 'decided', answer: '성수동', reason: '많다', from: 'manual' });
  const { resultId } = await runTool(echoTool, { source: { ideaId: idea.id, docKey: 'prd' }, input: {} });
  const prompt = ((await getToolResult(idea.id, resultId))?.data as { echo: string }).echo;
  expect(prompt).toContain('### 정한 것\n- 지역은? → 성수동 (이유: 많다)');
  expect(prompt).toContain('정한 것은 다시 묻지 말고 따른다');
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/storage src/lib/tools` → FAIL

- [ ] **Step 3: 구현**

`prompts/context.ts`:
- `CHAIN_RULES` · `TOOL_RULES` 각각의 "개수 · 합계…" 줄 다음에 한 줄 추가: `- "정한 것"은 다시 묻지 말고 따른다. "보류한 것"은 [확인 필요]로 남긴다.`
- `PROJECT_BLOCK`을:
```ts
export const PROJECT_BLOCK = {
  context: '### 프로젝트 맥락',
  decided: '### 정한 것',
  deferred: '### 보류한 것',
  reason: '이유',
  deferReason: '보류 이유',
} as const;
```
`docs.ts` — `projectBlock` · `ideaSource` · `getDocs` 교체 (import에 `listDecisions` from `./decisions`, `type Decision`):
```ts
/** 맥락 · 정한 것 · 보류한 것 블록. 모두 비면 '' — 그래야 기존 아이디어의 입력 · 해시가 그대로다 */
export function projectBlock(context: IdeaContext, decisions: Decision[] = []): string {
  const B = PROJECT_BLOCK;
  const parts: [string, string[]][] = [
    [B.context, CONTEXT_FIELDS.filter((f) => context[f.key].trim()).map((f) => `- ${f.label}: ${oneLine(context[f.key])}`)],
    [B.decided, decisions.filter((d) => d.status === 'decided').map((d) => `- ${oneLine(d.question)} → ${oneLine(d.answer)} (${B.reason}: ${oneLine(d.reason)})`)],
    [B.deferred, decisions.filter((d) => d.status === 'deferred').map((d) => `- ${oneLine(d.question)} (${B.deferReason}: ${oneLine(d.reason)})`)],
  ];
  return parts.filter(([, lines]) => lines.length).map(([h, lines]) => `${h}\n${lines.join('\n')}`).join('\n\n');
}

export const ideaSource = (idea: Pick<Idea, 'title' | 'memo' | 'context'>, decisions: Decision[] = []) =>
  [`# ${idea.title}\n\n${idea.memo}`.trim(), projectBlock(idea.context, decisions)].filter(Boolean).join('\n\n');
```
`getDocs`: `const idea = await getIdea(id);` → `const [idea, decisions] = await Promise.all([getIdea(id), listDecisions(id)]);`, `ideaSource(idea)` → `ideaSource(idea, decisions)`.
(`decisions.ts`는 `docs.ts`를 import하지 않으므로 순환 없음 — `keepHistory`는 `history.ts`)

`chain/generate.ts`: storage import에 `listDecisions`. `const docs = await getDocs(id);` 다음 줄에 `const decisions = await listDecisions(id);`, `ideaSource(idea)` → `ideaSource(idea, decisions)`.

`tools/run.ts`: storage import에 `listDecisions`. Task 2의 두 줄을:
```ts
  const idea = ideaId ? await getIdea(ideaId) : null;
  const project = idea ? projectBlock(idea.context, await listDecisions(idea.id)) : '';
```

- [ ] **Step 4: 통과 확인** — `npm test` 전체 PASS (`generate.test.ts`의 stale 테스트 포함)

- [ ] **Step 5: 커밋**
```bash
git add src/lib
git commit -m "feat(chain): 정한 것 · 보류한 것을 기획안 · 도구 입력에 넣는다 (#44)"
```

---

### Task 7: 요약 판 결정 칸 (읽기)

**Files:**
- Modify: `src/lib/summary/index.ts` · `src/lib/summary/parse.ts` (주석만) · `src/app/ideas/[id]/page.tsx` · `src/app/ideas/[id]/idea-summary.tsx`
- Test: `src/lib/summary/index.test.ts`

**Interfaces:**
- Consumes: `type Decision` (Task 5) · `listDecisions`
- Produces: `SummaryInput.decisions: Decision[]` · `Summary.decisions: { open: string[]; openMore: number; recorded: Decision[] }`

- [ ] **Step 1: 실패하는 테스트** — `index.test.ts`의 `input()` 기본값에 `decisions: []` 추가. 기존 `decisions` 관련 기대가 `string[]`이면 `.decisions.open`으로 바꾸고, 새 describe 추가 (import에 `type Decision` from `@/lib/storage/types`):
```ts
describe('결정 칸', () => {
  const rec = (question: string, from: Decision['from'] = 'plan'): Decision => ({
    id: question, question, status: 'decided', answer: 'a', reason: 'r', from, decidedAt: '2026-10-29T00:00:00.000Z',
  });
  const plan = '## 확인 필요\n- 지역은? [확인 필요: 지역]\n- 결제는?\n- 1\n- 2\n- 3\n- 4\n- 5\n';
  it('답한 질문은 아직 안 정한 것에서 빠진다 (공백 차이 무시)', () => {
    const s = summarize(input({ docs: docsWith({ ...ALL, plan }), decisions: [rec('  지역은?  ')] }));
    expect(s.decisions.open).toEqual(['결제는?', '1', '2', '3', '4']);
    expect(s.decisions.openMore).toBe(1);
    expect(s.decisions.recorded.map((d) => d.question)).toEqual(['  지역은?  ']);
  });
  it('직접 추가한 결정은 recorded에만, 기획안 없으면 open은 비어 있다', () => {
    const s = summarize(input({ docs: docsWith({}), decisions: [rec('가격은?', 'manual')] }));
    expect(s.decisions).toEqual({ open: [], openMore: 0, recorded: [rec('가격은?', 'manual')] });
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/summary` → FAIL

- [ ] **Step 3: 구현** — `summary/index.ts`:
```ts
import type { Decision, Doc, DocKey } from '../storage/types';
// SummaryInput에:
  /** 저장된 결정 · 보류 (저장 순) */
  decisions: Decision[];
// Summary의 decisions를:
  /** open: 기획안 질문 중 결정이 없는 것 (최대 5) · recorded: 저장된 결정 전부 */
  decisions: { open: string[]; openMore: number; recorded: Decision[] };

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function decisionsOf(plan: string | null, recorded: Decision[]): Summary['decisions'] {
  const answered = new Set(recorded.map((d) => norm(d.question)));
  const open = (plan ? planDecisions(plan) : []).filter((q) => !answered.has(norm(q)));
  return { open: open.slice(0, MAX), openMore: Math.max(0, open.length - MAX), recorded };
}
// summarize 반환의 decisions 줄을:
    decisions: decisionsOf(plan, input.decisions),
```
`parse.ts`의 `planDecisions` 주석 끝 "4a(결정 기록)에서 사람이 고른 결정으로 바뀐다"를 "답한 질문은 summary가 뺀다"로.

`page.tsx`: storage import에 `listDecisions`. `Promise.all`에 `listDecisions(id).catch(() => [])` 추가 → `decisions`, `summarize({ …, decisions })`. 결정 목록은 `summary.decisions.recorded`로 화면에 간다 (따로 props 없음).

`idea-summary.tsx` — 결정 칸을 읽기 전용으로 교체 (Task 8에서 버튼 · 폼을 붙인다):
```tsx
  const { open, openMore, recorded } = decisions;
  const hasDecisions = open.length > 0 || recorded.length > 0;
// 기존 {decisions.length > 0 && <Cell title="지금 내려야 할 결정">…} 를:
      {hasDecisions && (
        <Cell title="결정">
          <FlexBox flexDirection="column" gap="12px">
            {open.length > 0 && (
              <Box>
                {sub('아직 안 정한 것')}
                {items([...open, ...(openMore > 0 ? [`외 ${openMore}개`] : [])])}
              </Box>
            )}
            {recorded.length > 0 && (
              <Box>
                {sub('정한 것 · 보류한 것')}
                {items(recorded.map((d) => <DecisionLine key={d.id} d={d} />))}
              </Box>
            )}
          </FlexBox>
        </Cell>
      )}
```
같은 파일에 보조 컴포넌트:
```tsx
const sub = (t: string) => (
  <Typography as="h3" variant="caption1" weight="bold" color="semantic.foreground.neutral.tertiary" sx={{ display: 'block', marginBottom: '4px' }}>
    {t}
  </Typography>
);

function DecisionLine({ d }: { d: Decision }) {
  return (
    <>
      {d.status === 'decided' ? `${d.question} → ${d.answer}` : `${d.question} · 보류`}
      <Typography as="span" variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block' }}>
        {d.status === 'decided' ? '이유' : '보류 이유'}: {d.reason}
      </Typography>
    </>
  );
}
```
(type import에 `Decision` from `@/lib/storage`)

- [ ] **Step 4: 통과 확인** — `npm run lint && npm run typecheck && npm test`

- [ ] **Step 5: 커밋**
```bash
git add src/lib/summary "src/app/ideas/[id]"
git commit -m "feat(bank): 요약 판 결정 칸에 정한 것 · 보류한 것 (#44)"
```

---

### Task 8: 정하기 · 수정 · 지우기 · 직접 추가

**Files:**
- Create: `src/app/ideas/[id]/decision-form.tsx`
- Modify: `src/app/actions.ts` · `src/app/ideas/[id]/page.tsx` · `src/app/ideas/[id]/idea-detail.tsx` · `src/app/ideas/[id]/idea-summary.tsx`

**Interfaces:**
- Consumes: `saveDecision` · `removeDecision` · `type DecisionInput` · `type Decision` (Task 5) · `Summary.decisions` (Task 7)
- Produces: `type DecisionState = { error?: string; values?: DecisionInput; savedAt?: number }` · `saveDecisionAction(id: string, decisionId: string | null, prev: DecisionState, formData: FormData): Promise<DecisionState>` · `removeDecisionAction(id: string, decisionId: string): Promise<void>`

- [ ] **Step 1: Server Action** — `actions.ts` (storage import에 `removeDecision, saveDecision, type DecisionInput`):
```ts
export type DecisionState = { error?: string; values?: DecisionInput; savedAt?: number };

export async function saveDecisionAction(
  id: string,
  decisionId: string | null,
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const get = (k: string) => String(formData.get(k) ?? '');
  const values: DecisionInput = {
    question: get('question'),
    status: get('status') === 'deferred' ? 'deferred' : 'decided',
    answer: get('answer'),
    reason: get('reason'),
    from: get('from') === 'plan' ? 'plan' : 'manual',
  };
  if (isDemo()) return { error: DEMO_MESSAGE, values };
  try {
    await saveDecision(id, values, decisionId ?? undefined);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export async function removeDecisionAction(id: string, decisionId: string) {
  if (isDemo()) return;
  await removeDecision(id, decisionId);
  revalidateIdeas();
}
```

- [ ] **Step 2: 폼 컴포넌트** — `src/app/ideas/[id]/decision-form.tsx`:
```tsx
'use client';

import { useActionState, useState } from 'react';
import { Button, FlexBox, SectionMessage, TextArea, TextField, Typography } from '@montage-ui/core';

import type { Decision, DecisionInput } from '@/lib/storage';
import type { DecisionState } from '../../actions';

type Props = {
  /** 기획안 질문에 답할 때: 질문은 고정 (from='plan') */
  question?: string;
  /** 수정할 때 처음 값 */
  initial?: Decision;
  action: (prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  onClose: () => void;
  disabled: boolean;
};

export default function DecisionForm({ question, initial, action, onClose, disabled }: Props) {
  // 저장에 성공하면 닫는다
  const save = async (prev: DecisionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (!next.error) onClose();
    return next;
  };
  const [state, formAction, pending] = useActionState(save, {});
  const v: Partial<DecisionInput> = state.values ?? initial ?? {};
  const [status, setStatus] = useState<Decision['status']>(v.status ?? 'decided');
  const fixed = question ?? (initial?.from === 'plan' ? initial.question : undefined);
  const from = question ? 'plan' : (initial?.from ?? 'manual');

  return (
    <form action={formAction}>
      <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: '8px' }}>
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="status" value={status} />
        {fixed !== undefined ? (
          <input type="hidden" name="question" value={fixed} />
        ) : (
          <TextField name="question" placeholder="정할 것 (예: 첫 출시 지역)" defaultValue={v.question} aria-label="정할 것" />
        )}
        <FlexBox gap="8px" role="group" aria-label="정함 또는 보류">
          {(['decided', 'deferred'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="small"
              variant={status === s ? 'solid' : 'outlined'}
              color={status === s ? 'primary' : 'assistive'}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s === 'decided' ? '정함' : '보류'}
            </Button>
          ))}
        </FlexBox>
        {status === 'decided' && <TextField name="answer" placeholder="고른 답" defaultValue={v.answer} aria-label="고른 답" />}
        <TextArea
          name="reason"
          placeholder={status === 'decided' ? '왜 이렇게 정했나요?' : '왜 미루나요? 무엇을 알면 정할 수 있나요?'}
          defaultValue={v.reason}
          minRows={2}
          width="100%"
          aria-label="이유"
        />
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
        <FlexBox justifyContent="flex-end" gap="8px">
          <Button size="small" variant="outlined" color="assistive" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" size="small" loading={pending} disabled={disabled}>
            저장
          </Button>
        </FlexBox>
      </FlexBox>
    </form>
  );
}
```
- `Button`의 `variant`/`color` 값이 타입 오류면 `idea-form.tsx` · `doc-card.tsx`에서 쓰는 값으로 맞춘다 (`montage-ui` 스킬)
- `Typography` import가 안 쓰이면 뺀다

- [ ] **Step 3: 요약 칸에 연결** — `idea-summary.tsx`
  - `Props`에 `saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>` · `removeDecision: (decisionId: string) => Promise<void>` · `disabled: boolean` 추가 (type import `DecisionState` from `../../actions`)
  - `IdeaSummary` 안에 `const demo = useDemo();` (`import { useDemo } from '../../_components/demo';`) · `const [opening, setOpening] = useState<{ kind: 'plan'; question: string } | { kind: 'edit'; id: string } | { kind: 'new' } | null>(null);` · `const close = () => setOpening(null);`
  - 칸 표시: `hasDecisions || !demo` 일 때. 로컬에서 셋 다 비면 `text('정할 게 생기면 여기에 남겨요.')`
  - 아직 안 정한 것: `items(open.map(q => …))`의 각 항목을
```tsx
<>
  <FlexBox justifyContent="space-between" alignItems="flex-start" gap="8px">
    <span>{q}</span>
    {!demo && opening === null && (
      <Button size="small" variant="outlined" color="assistive" onClick={() => setOpening({ kind: 'plan', question: q })} disabled={disabled}>
        정하기
      </Button>
    )}
  </FlexBox>
  {opening?.kind === 'plan' && opening.question === q && (
    <DecisionForm question={q} action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />
  )}
</>
```
  - 정한 것 · 보류한 것: 각 `DecisionLine` 오른쪽에 (`!demo && opening === null`) "수정"(`setOpening({ kind: 'edit', id: d.id })`) · "지우기" 버튼, 수정 중이면 그 줄 아래 `<DecisionForm initial={d} action={saveDecision.bind(null, d.id)} onClose={close} disabled={disabled} />`. 지우기는
```tsx
<form action={() => removeDecision(d.id)} onSubmit={(e) => { if (!window.confirm('이 결정을 지울까요? 이전 판은 .history에 남아요.')) e.preventDefault(); }}>
  <Button type="submit" size="small" variant="outlined" color="assistive" disabled={disabled}>지우기</Button>
</form>
```
  - 칸 맨 아래 (`!demo`): `opening?.kind === 'new'` 이면 `<DecisionForm action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />`, 아니고 `opening === null`이면 `<Button size="small" variant="outlined" color="assistive" onClick={() => setOpening({ kind: 'new' })} disabled={disabled}>결정 직접 추가</Button>`
  - 한 번에 폼 하나만 연다 (`opening === null`일 때만 버튼)

- [ ] **Step 4: 페이지 · 상세 연결**
  - `page.tsx`: actions import에 `saveDecisionAction, removeDecisionAction`. `<IdeaDetail>`에 `saveDecisionAction={saveDecisionAction.bind(null, id)}` · `removeDecisionAction={removeDecisionAction.bind(null, id)}`
  - `idea-detail.tsx`: `Props`에 `saveDecisionAction: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>` · `removeDecisionAction: (decisionId: string) => Promise<void>`. `<IdeaSummary … saveDecision={saveDecisionAction} removeDecision={removeDecisionAction} disabled={generating} />`

- [ ] **Step 5: 검사** — `npm run lint && npm run typecheck && npm test`

- [ ] **Step 6: 화면 확인 (컨트롤러가 직접)** — `hatch-temp`(3111, 임시 데이터), 기획안이 있는 아이디어:
  1. 아직 안 정한 것 첫 줄 "정하기" → 답 · 이유 → 저장 → 그 줄이 정한 것으로 이동 · 기획안 "앞 문서가 바뀜"
  2. 보류 선택 → 답 칸 사라짐 → 이유만 저장 → "· 보류" 표시
  3. 이유 비우고 저장 → "이유를 적어 주세요." · 입력 유지
  4. 수정 → 답 바꿈 → 저장 / 지우기 → 확인 → 목록에서 빠짐 · 질문이 아직 안 정한 것으로 돌아옴
  5. 결정 직접 추가 → 정한 것에만 나옴
  6. 문서 생성 중 버튼들 비활성 · 콘솔 오류 없음

- [ ] **Step 7: 커밋**
```bash
git add src/app/actions.ts "src/app/ideas/[id]"
git commit -m "feat(bank): 결정 정하기 · 수정 · 지우기 · 직접 추가 (#44)"
```

---

### Task 9: 데모 샘플 · 문서 · 기록 (Part 2 마무리)

**Files:**
- Create: `demo-data/ideas/20261028-1441-n9rp/decisions.md` · `docs/decisions/2026-10-29_결정-기록.md`
- Modify: `src/lib/storage/CLAUDE.md` · `docs/ai-usage/prompts.md` · `docs/decisions/README.md`

- [ ] **Step 1: 데모 결정** — `decisions.md`:
```yaml
---
version: 1
items:
  - id: a1b2
    question: 첫 출시 지역을 어디로 할 것인가?
    status: decided
    answer: 공방이 몰린 한 개 구에서 시작
    reason: 동네 단위 추천은 공급이 모여 있어야 결과가 빈약하지 않다
    from: plan
    decidedAt: '2026-10-29T09:00:00.000Z'
---
```
- [ ] **Step 2: storage CLAUDE.md** — 저장 형식에 `<id>/decisions.md` (머리말 `items` = 결정 목록, 고치기 전 판은 `.history/decisions-<시각>.md`) · 파일 지도에 `decisions.ts` · `history.ts` 한 줄
- [ ] **Step 3: prompts.md §5** — `2026-10-29 · CHAIN_RULES · TOOL_RULES에 "정한 것은 다시 묻지 말고 따른다. 보류한 것은 [확인 필요]로" · 입력 블록에 "### 정한 것 / ### 보류한 것" · #44`
- [ ] **Step 4: why 기록** — `docs/decisions/2026-10-29_결정-기록.md` (What: AI가 남긴 질문에 답하거나 직접 결정을 적으면 이유와 함께 남고 다음 문서가 따른다 / Why: 사람이 정한 답이 어디에도 안 남아 다시 만들면 같은 질문이 반복됐다 · 피드백 2 · 7 / 판단 근거: 보류도 이유와 함께 남겨 "모르는 것"을 숨기지 않음, 결정이 바뀌면 기획안이 바뀐 것으로 보여 영향이 드러남). README 표에 한 줄
- [ ] **Step 5: 검증 · 데모 확인** — `npm run lint && npm run typecheck && npm test && npm run build` → `hatch-demo`(3110) n9rp: 결정 칸에 "첫 출시 지역…" 정한 것 · 아직 안 정한 것 2개 · 버튼 없음 · 콘솔 오류 없음
- [ ] **Step 6: 커밋**
```bash
git add demo-data src/lib/storage/CLAUDE.md docs
git commit -m "docs(bank): 결정 데모 샘플 · why 기록 (#44)"
```
→ `hatch-reviewer` → PR #44 → 사용자 승인 후 squash 머지
