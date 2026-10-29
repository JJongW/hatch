# 확인 질문 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서의 `[확인 필요: X]`를 AI가 "고객에게 물을 것" · "담당자에게 확인할 것"(역할별)으로 나눈 질문 목록으로 만들어 아이디어 상세에 보여 주고, 질문마다 답을 4a 결정으로 남긴다.

**Architecture:** 코드가 문서에서 라벨을 모은다(`collectUnknowns`, 순수). 버튼을 누르면 `makeQuestions`가 라벨 목록 · 맥락 · 결정을 넣어 `claude -p`(JSON)를 부르고, `validateQuestions`가 고치거나 버린 뒤 `<id>/questions.md`에 저장한다. 화면 계산(사라진 라벨 숨김 · 답함 · 새 라벨)은 `questionView`(순수)가 하고, 페이지가 계산해 props로 넘긴다. 답은 기존 `DecisionForm` · `saveDecisionAction`을 `from: 'question'`으로 재사용한다.

**Tech Stack:** Next.js 16 App Router · React 19 `useActionState` · Montage UI · gray-matter · zod · vitest

**Spec:** `docs/specs/2026-10-29-confirm-questions-design.md` · **PR:** Part 1 = #47 (Task 1–6, 브랜치 `feat/47-confirm-questions`, 스펙 커밋이 이미 있음) · Part 2 = #48 (Task 7–9, 브랜치 `feat/48-question-answers`, Part 1 머지 후 main에서)

## Global Constraints
- 라벨 정규화는 요약 판(`countUnknowns`)과 한 함수(`unknownLabel`)를 같이 쓴다. `○○`(형식 설명 자리)는 제외, 라벨 없는 `[확인 필요]`는 질문에서 빼고 수만 센다
- 질문으로 만드는 라벨은 많은 순 최대 30개 (`QUESTION_LABEL_MAX = 30`). 라벨마다 예시 줄 최대 2개, 줄은 공백 정리 후 200자에서 자름
- 질문 항목: `kind` = `'customer' | 'owner'`, `role` = `'기획' | '개발' | '디자인' | '데이터' | '법무' | '운영'`(owner) 또는 `''`(customer), `question` 최대 200자
- 실패 문구: 라벨 0개 `질문으로 만들 [확인 필요]가 없어요.` · 라벨이 빠짐 `질문을 다 만들지 못했어요. 다시 눌러 주세요.` · 그 밖 `질문을 만들지 못했어요. 서버 로그를 확인해 주세요.`
- 저장 `<id>/questions.md` 머리말 `version: 1 · createdAt · labels · items`. 다시 만들 때 이전 판은 `.history/questions-<시각>.md`. "답함"은 저장하지 않고 같은 질문 문장(공백 무시)의 결정이 있는지로 계산
- 프롬프트 문자열은 `src/lib/prompts/`에만. 출력 스키마는 코드 쪽(`src/lib/questions/validate.ts`)
- 화면 컴포넌트는 `@/lib/storage` · `@/lib/questions`를 값으로 import하지 않는다 (type import만). 값은 페이지가 props로
- 데모(`useDemo()` / `isDemo()`)에서는 만들기 · 다시 만들기 · 답 적기가 없다. Server Action도 `DEMO_MESSAGE`로 거부
- 만드는 중에는 다른 저장 · 생성 버튼을 막고, 문서 생성 중에는 만들기 · 답 적기를 막는다 (Server Action 하나씩)
- 화면 문구 · 커밋은 한국어. 커밋 `<type>(bank): 내용 (#이슈)` + 마지막 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

## 스펙과 다르게 정한 것 (구현 세부)
- 출력 스키마는 spec §8의 `prompts/questions.ts`가 아니라 `questions/validate.ts`에 둔다. `src/lib/prompts/CLAUDE.md` 규칙(문자열만)을 따른다
- `QuestionSet` 타입에는 `version`을 넣지 않는다. 파일 머리말에만 쓴다 (결정과 같은 방식)
- 같은 라벨이 두 번 오면 **처음으로 검사를 통과한** 항목을 쓴다
- 빠진 것 안내는 "질문에서 빠진 것: 라벨 없는 표시 N곳 · 31번째부터 M개" (spec §5 문구는 한쪽만 있을 때 조사가 어색해서)
- `questionView`의 "답한 것" 계산은 Part 1에 넣는다 (직접 추가한 결정이 같은 질문이면 이미 답함). Part 2는 답 적기 폼만 더한다

---

# Part 1 — 만들기 · 저장 (#47)

### Task 1: 라벨 모으기

**Files:**
- Modify: `src/lib/summary/parse.ts`
- Create: `src/lib/questions/collect.ts`
- Test: `src/lib/summary/parse.test.ts` (기존 테스트 그대로 통과) · `src/lib/questions/questions.test.ts` (새 파일)

**Interfaces:**
- Produces: `unknownLabel(raw: string): string | null` · `norm(s: string): string` (parse.ts) · `type UnknownExample = { doc: string; line: string }` · `type UnknownGroup = { label: string; count: number; examples: UnknownExample[] }` · `type Collected = { groups: UnknownGroup[]; unnamed: number }` · `QUESTION_LABEL_MAX = 30` · `collectUnknowns(docs: { label: string; content: string | null }[]): Collected` (collect.ts, 순수 — `server-only` 없음)

- [ ] **Step 1: 실패하는 테스트**

`src/lib/questions/questions.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { collectUnknowns } from './collect';

const doc = (label: string, content: string | null) => ({ label, content });

describe('collectUnknowns', () => {
  it('라벨별 수 · 예시 줄 2개(같은 줄은 한 번) · 많은 순', () => {
    const c = collectUnknowns([
      doc('기획안', '목표는 [확인 필요: 목표 수치]다.\n지역 [확인 필요: 지역] 과 [확인 필요:지역]'),
      doc('PRD', '- 전환율 [확인 필요: 목표 수치]\n- 또 [확인 필요: 목표 수치]'),
      doc('개발 로드맵', null),
    ]);
    expect(c.groups.map((g) => [g.label, g.count])).toEqual([['목표 수치', 3], ['지역', 2]]);
    expect(c.groups[0].examples).toEqual([
      { doc: '기획안', line: '목표는 [확인 필요: 목표 수치]다.' },
      { doc: 'PRD', line: '- 전환율 [확인 필요: 목표 수치]' },
    ]);
    expect(c.groups[1].examples).toEqual([{ doc: '기획안', line: '지역 [확인 필요: 지역] 과 [확인 필요:지역]' }]);
    expect(c.unnamed).toBe(0);
  });
  it('라벨 없는 표시는 수만, 형식 설명(○○)은 제외', () => {
    expect(collectUnknowns([doc('기획안', '[확인 필요] 하나\n[확인 필요 ] 둘\n"[확인 필요: ○○]"로 남긴다')])).toEqual({ groups: [], unnamed: 2 });
  });
  it('예시 줄은 공백을 정리하고 200자에서 자른다', () => {
    const line = '  ' + '가'.repeat(250) + '   [확인 필요: 길이]';
    expect(collectUnknowns([doc('PRD', line)]).groups[0].examples[0].line).toBe('가'.repeat(200));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/questions/questions.test.ts`
Expected: FAIL — `Cannot find module './collect'` (또는 비슷한 모듈 없음 오류)

- [ ] **Step 3: parse.ts — 라벨 정규화 · norm을 함수로 꺼낸다**

`src/lib/summary/parse.ts`의 `countUnknowns`를 아래로 바꾸고, 그 위에 두 함수를 더한다:
```ts
/** 비교용 공백 정리 (결정 질문 매칭 · 확인 질문 답함 계산) */
export const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** `TBD` 그룹 1 → 라벨. 형식 설명 자리(○○)면 null, 라벨이 없으면 UNNAMED (요약 판 · 확인 질문이 같이 쓴다) */
export function unknownLabel(raw: string): string | null {
  const label = norm(raw.replace(/^\s*:/, '')) || UNNAMED;
  return label === PLACEHOLDER ? null : label;
}

/** 모든 `[확인 필요: X]`를 X로 묶어 센다. 많은 순, 같으면 처음 나온 순 (Map 삽입 순 + 안정 정렬) */
export function countUnknowns(texts: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const m of text.matchAll(TBD)) {
      const label = unknownLabel(m[1]);
      if (label !== null) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
```
`src/lib/summary/index.ts`의 `const norm = …` 줄을 지우고 import를 `import { countUnknowns, firstParagraph, norm, planDecisions, section } from './parse';`로 바꾼다.

- [ ] **Step 4: collect.ts**

`src/lib/questions/collect.ts`:
```ts
// [확인 필요] 라벨 모으기 — 순수 계산 (화면 계산 · 만들기가 같이 쓴다)
import { norm, UNNAMED, unknownLabel } from '../summary/parse';
import { TBD } from '../tbd';

export type UnknownExample = { doc: string; line: string };
export type UnknownGroup = { label: string; count: number; examples: UnknownExample[] };
export type Collected = { groups: UnknownGroup[]; unnamed: number };

/** 질문으로 만드는 라벨 수. 넘는 라벨은 이번 목록에서 빠지고 수만 안내 (spec §2) */
export const QUESTION_LABEL_MAX = 30;
const EXAMPLES = 2;
const LINE_MAX = 200;

/** 줄 단위로 라벨을 묶는다. groups는 많은 순 전부(자르지 않음), 라벨 없는 표시는 unnamed 수만 */
export function collectUnknowns(docs: { label: string; content: string | null }[]): Collected {
  const groups = new Map<string, UnknownGroup>();
  let unnamed = 0;
  for (const doc of docs) {
    if (doc.content === null) continue;
    for (const raw of doc.content.split('\n')) {
      for (const m of raw.matchAll(TBD)) {
        const label = unknownLabel(m[1]);
        if (label === null) continue;
        if (label === UNNAMED) {
          unnamed++;
          continue;
        }
        const g = groups.get(label) ?? { label, count: 0, examples: [] };
        g.count++;
        const line = norm(raw).slice(0, LINE_MAX);
        if (g.examples.length < EXAMPLES && !g.examples.some((e) => e.line === line)) g.examples.push({ doc: doc.label, line });
        groups.set(label, g);
      }
    }
  }
  return { groups: [...groups.values()].sort((a, b) => b.count - a.count), unnamed };
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/questions/questions.test.ts src/lib/summary`
Expected: PASS (요약 테스트 포함 전부)

- [ ] **Step 6: 커밋**
```bash
git add src/lib/summary/parse.ts src/lib/summary/index.ts src/lib/questions/collect.ts src/lib/questions/questions.test.ts
git commit -m "feat(bank): [확인 필요] 라벨 모으기 (#47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 확인 질문 저장

**Files:**
- Modify: `src/lib/storage/types.ts` · `src/lib/storage/index.ts` · `src/lib/storage/CLAUDE.md`
- Create: `src/lib/storage/questions.ts`
- Test: `src/lib/storage/questions.test.ts` (새 파일)

**Interfaces:**
- Produces: `QUESTION_ROLES = ['기획', '개발', '디자인', '데이터', '법무', '운영'] as const` · `type QuestionRole` · `type QuestionItem = { label: string; kind: 'customer' | 'owner'; role: QuestionRole | ''; question: string }` · `type QuestionSet = { createdAt: string; labels: string[]; items: QuestionItem[] }` · `QUESTION_MAX = 200` · `QUESTION_FILE_VERSION = 1` · `getQuestions(id: string): Promise<QuestionSet | null>` · `saveQuestions(id: string, set: Pick<QuestionSet, 'labels' | 'items'>): Promise<QuestionSet>` — 모두 `@/lib/storage`에서 export

- [ ] **Step 1: 실패하는 테스트**

`src/lib/storage/questions.test.ts`:
```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getQuestions, saveQuestions, type QuestionItem } from '.';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const items: QuestionItem[] = [
  { label: '목표 수치', kind: 'owner', role: '데이터', question: '예약 전환율 목표는 몇 %인가요?' },
  { label: '사용자 조사', kind: 'customer', role: '', question: '퇴근 후 클래스를 어떻게 찾나요?' },
];

describe('확인 질문', () => {
  it('없으면 null, 저장하면 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(await getQuestions(idea.id)).toBeNull();
    const saved = await saveQuestions(idea.id, { labels: ['목표 수치', '사용자 조사'], items });
    expect(saved.items).toEqual(items);
    expect(await getQuestions(idea.id)).toEqual(saved);
  });
  it('다시 저장하면 이전 판은 .history에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveQuestions(idea.id, { labels: ['목표 수치'], items: [items[0]] });
    await saveQuestions(idea.id, { labels: ['목표 수치', '사용자 조사'], items });
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('questions-'))).toBe(true);
    expect((await getQuestions(idea.id))?.items).toHaveLength(2);
  });
  it('깨진 항목은 건너뛰고, 깨진 파일은 null', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'questions.md');
    await fs.writeFile(
      file,
      [
        '---',
        'version: 1',
        "createdAt: '2026-10-29T00:00:00.000Z'",
        'labels:',
        '  - 지역',
        'items:',
        '  - { label: 지역, kind: owner, role: 기획, question: 첫 출시 지역은 어디인가요? }',
        '  - { label: 지역, kind: owner, role: 영업, question: 깨짐 }',
        '  - { label: 지역, kind: customer, role: 개발, question: 깨짐 }',
        "  - { label: 지역, kind: customer, role: '', question: ' ' }",
        '---',
        '',
      ].join('\n'),
    );
    expect((await getQuestions(idea.id))?.items.map((q) => q.question)).toEqual(['첫 출시 지역은 어디인가요?']);
    await fs.writeFile(file, '---\nlabels: [\n---\n');
    expect(await getQuestions(idea.id)).toBeNull();
  });
  it('없는 아이디어면 거부', async () => {
    await expect(saveQuestions('20261029-0900-zzzz', { labels: [], items: [] })).rejects.toThrow(
      '아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.',
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/storage/questions.test.ts`
Expected: FAIL — `getQuestions`/`saveQuestions`가 export되지 않음

- [ ] **Step 3: 타입**

`src/lib/storage/types.ts` 끝에 추가:
```ts
/** 확인 질문 담당 역할 (화면 묶음 순서) */
export const QUESTION_ROLES = ['기획', '개발', '디자인', '데이터', '법무', '운영'] as const;
export type QuestionRole = (typeof QUESTION_ROLES)[number];

export type QuestionItem = {
  /** 문서의 `[확인 필요: 라벨]` 라벨 그대로 */
  label: string;
  /** 고객에게 물을 것 / 담당자에게 확인할 것 */
  kind: 'customer' | 'owner';
  /** owner면 역할, customer면 '' */
  role: QuestionRole | '';
  /** 한 문장, 최대 QUESTION_MAX자 (결정 "정할 것" 한도와 같음) */
  question: string;
};
export type QuestionSet = {
  /** ISO 8601 */
  createdAt: string;
  /** 만들 때 넣은 라벨 (새 라벨 감지용) */
  labels: string[];
  items: QuestionItem[];
};
export const QUESTION_MAX = 200;
export const QUESTION_FILE_VERSION = 1;
```

- [ ] **Step 4: storage/questions.ts**

`src/lib/storage/questions.ts`:
```ts
import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { QUESTION_FILE_VERSION, QUESTION_MAX, QUESTION_ROLES, type QuestionItem, type QuestionSet } from './types';

const file = (id: string) => path.join(ideaDir(id), 'questions.md');
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v); // 손으로 고친 날짜는 YAML Date

function isQuestionItem(v: unknown): v is QuestionItem {
  if (typeof v !== 'object' || v === null) return false;
  const q = v as Record<string, unknown>;
  if (typeof q.label !== 'string' || typeof q.question !== 'string') return false;
  if (!q.question.trim() || q.question.length > QUESTION_MAX) return false;
  if (q.kind === 'customer') return q.role === '';
  return q.kind === 'owner' && (QUESTION_ROLES as readonly unknown[]).includes(q.role);
}

/** 파일이 없거나 깨졌으면 null(아직 안 만듦), 깨진 항목은 건너뛴다 */
export async function getQuestions(id: string): Promise<QuestionSet | null> {
  assertValidId(id);
  let raw: string;
  try {
    raw = await fs.readFile(file(id), 'utf8');
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
  try {
    const d = matter(raw).data;
    const createdAt = iso(d.createdAt);
    if (typeof createdAt !== 'string' || !Array.isArray(d.labels) || !Array.isArray(d.items)) return null;
    return {
      createdAt,
      labels: d.labels.filter((l: unknown): l is string => typeof l === 'string'),
      items: d.items.filter(isQuestionItem),
    };
  } catch {
    return null;
  }
}

/** 통째로 바꾼다. 이전 판은 .history/questions-<시각>.md */
export async function saveQuestions(id: string, set: Pick<QuestionSet, 'labels' | 'items'>): Promise<QuestionSet> {
  if (!(await getIdea(id))) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const saved: QuestionSet = { createdAt: new Date().toISOString(), labels: set.labels, items: set.items };
  await keepHistory(id, file(id), 'questions');
  await fs.writeFile(file(id), matter.stringify('', { version: QUESTION_FILE_VERSION, ...saved }));
  return saved;
}
```

- [ ] **Step 5: index.ts export**

`src/lib/storage/index.ts`에서 decisions 줄 아래에 추가하고, types export 묶음에 새 이름을 더한다:
```ts
export { getQuestions, saveQuestions } from './questions';
```
```ts
export {
  CONTEXT_FIELDS,
  CONTEXT_MAX,
  DOC_STEPS,
  EMPTY_CONTEXT,
  QUESTION_MAX,
  QUESTION_ROLES,
  type Decision,
  type DecisionInput,
  type Doc,
  type DocKey,
  type DocStep,
  type Idea,
  type IdeaContext,
  type QuestionItem,
  type QuestionRole,
  type QuestionSet,
} from './types';
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/lib/storage`
Expected: PASS

- [ ] **Step 7: storage CLAUDE.md**

`src/lib/storage/CLAUDE.md`
- 파일 지도 줄의 `` `decisions.ts` — 결정 · 보류 기록 `` 뒤에 ` · \`questions.ts\` — 확인 질문`을 더한다
- 저장 형식에서 결정 줄 아래에 한 줄을 더한다: `확인 질문 \`<id>/questions.md\` (머리말 \`labels\` · \`items\`, 다시 만들기 전 판은 \`.history/questions-<시각>.md\`)`

- [ ] **Step 8: 커밋**
```bash
git add src/lib/storage/types.ts src/lib/storage/questions.ts src/lib/storage/questions.test.ts src/lib/storage/index.ts src/lib/storage/CLAUDE.md
git commit -m "feat(bank): 확인 질문 저장 (#47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 질문 만들기 (프롬프트 · 검사 · 실행)

**Files:**
- Create: `src/lib/prompts/questions.ts` · `src/lib/questions/validate.ts` · `src/lib/questions/make.ts` · `src/lib/questions/index.ts`
- Modify: `src/lib/claude/fake-claude.mjs` · `src/lib/prompts/CLAUDE.md`
- Test: `src/lib/questions/questions.test.ts`

**Interfaces:**
- Consumes: `collectUnknowns` · `QUESTION_LABEL_MAX` · `UnknownGroup` (Task 1) · `getQuestions` · `saveQuestions` · `QuestionItem` · `QuestionSet` · `QUESTION_ROLES` · `QUESTION_MAX` (Task 2) · `projectBlock(context, decisions)` · `getIdea` · `getDocs` · `listDecisions` · `saveDoc` (storage, 기존) · `runClaude` · `ChainError` (`@/lib/claude/run`) · `toClaudeSchema` (`@/lib/claude/schema`) · `INPUT_HEADING` (`@/lib/prompts/context`)
- Produces: `questionsSchema` (zod) · `validateQuestions(labels: string[], raw: unknown): QuestionItem[] | null` · `questionsPrompt(idea: { title: string; memo: string }, project: string, groups: UnknownGroup[]): string` · `makeQuestions(id: string): Promise<QuestionSet>` · `@/lib/questions` 입구 = `makeQuestions` · `collectUnknowns` · `QUESTION_LABEL_MAX` · `type Collected` · `type UnknownGroup`

- [ ] **Step 1: 실패하는 테스트**

`src/lib/questions/questions.test.ts` 맨 위 import를 아래로 바꾸고, 파일 끝에 describe 세 개를 더한다:
```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getQuestions, saveDoc } from '@/lib/storage';

import { collectUnknowns } from './collect';
import { makeQuestions, questionsPrompt } from './make';
import { validateQuestions } from './validate';
```
```ts
describe('validateQuestions', () => {
  const labels = ['목표 수치', '사용자 조사'];
  const ok = {
    items: [
      { label: '사용자 조사', kind: 'customer', role: '개발', question: '  퇴근 후  클래스를 어떻게 찾나요? ' },
      { label: '목표 수치', kind: 'owner', role: '', question: '전환율 목표는 몇 %인가요?' },
    ],
  };
  it('입력 라벨 순서로, customer role은 비우고 owner 빈 role은 기획', () => {
    expect(validateQuestions(labels, ok)).toEqual([
      { label: '목표 수치', kind: 'owner', role: '기획', question: '전환율 목표는 몇 %인가요?' },
      { label: '사용자 조사', kind: 'customer', role: '', question: '퇴근 후 클래스를 어떻게 찾나요?' },
    ]);
  });
  it('모르는 라벨 · 중복은 버리고 처음 통과한 항목만', () => {
    const r = validateQuestions(labels, {
      items: [
        { label: '목표 수치', kind: 'boss', role: '', question: '버려짐' },
        ...ok.items,
        { label: '없는 라벨', kind: 'customer', role: '', question: '버려짐' },
        { label: '목표 수치', kind: 'owner', role: '데이터', question: '두 번째' },
      ],
    });
    expect(r?.map((q) => q.question)).toEqual(['전환율 목표는 몇 %인가요?', '퇴근 후 클래스를 어떻게 찾나요?']);
  });
  it('잘못된 kind/role · 빈 질문 · 200자 초과는 버려서 라벨이 빠지면 null', () => {
    const bad = (over: Record<string, unknown>) => validateQuestions(labels, { items: [ok.items[0], { ...ok.items[1], ...over }] });
    expect(bad({ kind: 'boss' })).toBeNull();
    expect(bad({ role: '영업' })).toBeNull();
    expect(bad({ question: '  ' })).toBeNull();
    expect(bad({ question: 'a'.repeat(201) })).toBeNull();
    expect(bad({ question: 'a'.repeat(200) })).not.toBeNull();
  });
  it('모양이 다르면 null', () => {
    expect(validateQuestions(labels, null)).toBeNull();
    expect(validateQuestions(labels, { items: 'x' })).toBeNull();
  });
});

describe('questionsPrompt', () => {
  it('아이디어 · 맥락 블록 · 라벨 목록(수 · 예시 줄)', () => {
    const p = questionsPrompt({ title: '동네 클래스', memo: '' }, '### 정한 것\n- 지역 → 성수 (이유: 많다)', [
      { label: '목표 수치', count: 2, examples: [{ doc: '기획안', line: '목표 [확인 필요: 목표 수치]' }] },
    ]);
    expect(p).toContain('### 아이디어\n# 동네 클래스');
    expect(p).toContain('### 정한 것\n- 지역 → 성수 (이유: 많다)');
    expect(p).toContain('### 확인 필요 목록\n- 목표 수치 (2곳)\n  - 기획안: 목표 [확인 필요: 목표 수치]');
  });
});

describe('makeQuestions', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
    process.env.HATCH_DATA_DIR = dir;
    process.env.HATCH_CLAUDE_BIN = path.join(here, '../claude/fake-claude.mjs');
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.HATCH_DATA_DIR;
    delete process.env.HATCH_CLAUDE_BIN;
    delete process.env.FAKE_CLAUDE;
  });
  const withPlan = async () => {
    const idea = await createIdea({ title: '동네 클래스', memo: '' });
    await saveDoc(idea.id, 'plan', '목표 [확인 필요: 목표 수치]\n조사 [확인 필요: 사용자 조사] [확인 필요: 목표 수치]', { sourceHash: 'x' });
    return idea;
  };

  it('라벨이 없으면 claude를 부르지 않는다', async () => {
    process.env.FAKE_CLAUDE = 'crash'; // 불렸다면 로그인 안내 오류가 난다
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(makeQuestions(idea.id)).rejects.toThrow('질문으로 만들 [확인 필요]가 없어요.');
  });
  it('가짜 claude로 만들어 저장하고, 다시 만들면 이전 판은 .history에', async () => {
    process.env.FAKE_CLAUDE = 'questions';
    const idea = await withPlan();
    const set = await makeQuestions(idea.id);
    expect(set.labels).toEqual(['목표 수치', '사용자 조사']);
    expect(set.items.map((q) => [q.label, q.kind, q.role])).toEqual([
      ['목표 수치', 'customer', ''],
      ['사용자 조사', 'owner', '개발'],
    ]);
    expect(await getQuestions(idea.id)).toEqual(set);
    await makeQuestions(idea.id);
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('questions-'))).toBe(true);
  });
  it('결과가 라벨을 빠뜨리면 실패하고 저장하지 않는다', async () => {
    process.env.FAKE_CLAUDE = 'metrics'; // 다른 도구 모양 → items 없음
    const idea = await withPlan();
    await expect(makeQuestions(idea.id)).rejects.toThrow('질문을 다 만들지 못했어요. 다시 눌러 주세요.');
    expect(await getQuestions(idea.id)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/questions/questions.test.ts`
Expected: FAIL — `./make` · `./validate` 모듈 없음

- [ ] **Step 3: 프롬프트**

`src/lib/prompts/questions.ts`:
```ts
/** 4b 확인 질문. [확인 필요] 라벨 → 고객 질문 · 담당자 확인. 출력 스키마: questionsSchema (src/lib/questions/validate.ts) */
export const QUESTIONS_RULES = `너는 한국 IT 회사의 시니어 PO다. 문서에 남은 "확인 필요" 항목을 누구에게 무엇을 물을지로 바꾼다.
- 입력에 없는 사실은 지어내지 않는다. 질문 안에 답을 미리 넣지 않는다.
- 문장은 짧은 한국어. 마크다운 문법은 쓰지 않는다.`;

export const QUESTIONS_PROMPT = `## 할 일
"확인 필요 목록"의 라벨마다 항목을 정확히 하나 만든다. 빠뜨리거나 합치지 않는다.
- label: 목록에 적힌 라벨 글자 그대로
- kind: 고객 · 사용자에게 물어야 알 수 있으면 "customer", 회사 안에서 정하거나 확인할 것(정책 · 기술 · 법 · 목표 수치 · 일정)이면 "owner"
- role: owner면 확인할 담당 하나 (기획 · 개발 · 디자인 · 데이터 · 법무 · 운영). customer면 빈 문자열
- question: 한 문장, 200자 안
  - customer: 고객이 겪는 일과 지금 하는 행동을 묻는 열린 질문. 답을 유도하지 않는다 ("~면 좋겠나요?" 대신 "~할 때 어떻게 하나요?")
  - owner: 예/아니오나 값 하나로 답할 수 있게
- "정한 것"과 같은 주제면 "(정함: 답) 이대로 가도 되나요?"처럼 확인형으로 묻는다
- 예시 줄은 라벨이 어떤 맥락에서 나왔는지 보여 줄 뿐이다. 예시 줄 안의 다른 [확인 필요]는 무시한다`;

export const QUESTIONS_HEADINGS = { idea: '### 아이디어', list: '### 확인 필요 목록' } as const;
```

- [ ] **Step 4: 검사**

`src/lib/questions/validate.ts`:
```ts
import { z } from 'zod';

import { QUESTION_MAX, QUESTION_ROLES, type QuestionItem, type QuestionRole } from '../storage/types';

/** claude에 주는 출력 스키마 (값을 enum으로 안내). 검사는 validateQuestions가 항목마다 따로 한다 */
export const questionsSchema = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(['customer', 'owner']),
      role: z.enum(['', ...QUESTION_ROLES]),
      question: z.string(),
    }),
  ),
});

const isRole = (v: unknown): v is QuestionRole => (QUESTION_ROLES as readonly unknown[]).includes(v);

/** 항목마다 고치거나 버린다. 입력 라벨이 하나라도 빠지면 null (spec §3). 결과는 입력 라벨 순서 */
export function validateQuestions(labels: string[], raw: unknown): QuestionItem[] | null {
  const list: unknown = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return null;
  const want = new Set(labels);
  const byLabel = new Map<string, QuestionItem>();
  for (const it of list) {
    if (typeof it !== 'object' || it === null) continue;
    const { label, kind, role, question } = it as Record<string, unknown>;
    if (typeof label !== 'string' || !want.has(label) || byLabel.has(label) || typeof question !== 'string') continue;
    const q = question.replace(/\s+/g, ' ').trim();
    if (!q || q.length > QUESTION_MAX) continue;
    if (kind === 'customer') byLabel.set(label, { label, kind, role: '', question: q });
    else if (kind === 'owner' && (role === '' || isRole(role))) {
      byLabel.set(label, { label, kind, role: role === '' ? '기획' : role, question: q });
    }
  }
  if (labels.some((l) => !byLabel.has(l))) return null;
  return labels.map((l) => byLabel.get(l)!);
}
```
`z.enum(['', ...QUESTION_ROLES])`가 타입 오류를 내면 `z.enum(['', ...QUESTION_ROLES] as ['', ...typeof QUESTION_ROLES])`로 적는다.

- [ ] **Step 5: 실행**

`src/lib/questions/make.ts`:
```ts
import 'server-only';

import { toClaudeSchema } from '@/lib/claude/schema';
import { ChainError, runClaude } from '@/lib/claude/run';
import { INPUT_HEADING } from '@/lib/prompts/context';
import { QUESTIONS_HEADINGS, QUESTIONS_PROMPT, QUESTIONS_RULES } from '@/lib/prompts/questions';
import { getDocs, getIdea, listDecisions, projectBlock, saveQuestions, type QuestionSet } from '@/lib/storage';

import { collectUnknowns, QUESTION_LABEL_MAX, type UnknownGroup } from './collect';
import { questionsSchema, validateQuestions } from './validate';

/** 규칙 + 할 일 + 입력(아이디어 · 맥락/결정 블록 · 라벨 목록). 문장은 prompts에만 있고 여기선 이어 붙이기만 */
export function questionsPrompt(idea: { title: string; memo: string }, project: string, groups: UnknownGroup[]) {
  const list = groups.map((g) => [`- ${g.label} (${g.count}곳)`, ...g.examples.map((e) => `  - ${e.doc}: ${e.line}`)].join('\n'));
  return [
    QUESTIONS_RULES,
    QUESTIONS_PROMPT,
    INPUT_HEADING,
    `${QUESTIONS_HEADINGS.idea}\n${`# ${idea.title}\n\n${idea.memo}`.trim()}`,
    project,
    `${QUESTIONS_HEADINGS.list}\n${list.join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** 문서 라벨 모으기 → claude → 검사 → questions.md 저장 (claude 잠금은 문서 생성과 같이 쓴다) */
export async function makeQuestions(id: string): Promise<QuestionSet> {
  const idea = await getIdea(id);
  if (!idea) throw new ChainError('아이디어를 찾을 수 없어요.');
  const [docs, decisions] = await Promise.all([getDocs(id), listDecisions(id)]);
  const groups = collectUnknowns(docs).groups.slice(0, QUESTION_LABEL_MAX);
  if (groups.length === 0) throw new ChainError('질문으로 만들 [확인 필요]가 없어요.');
  const raw = await runClaude({
    prompt: questionsPrompt(idea, projectBlock(idea.context, decisions), groups),
    jsonSchema: toClaudeSchema(questionsSchema),
  });
  const labels = groups.map((g) => g.label);
  const items = validateQuestions(labels, raw);
  if (!items) throw new ChainError('질문을 다 만들지 못했어요. 다시 눌러 주세요.');
  return saveQuestions(id, { labels, items });
}
```

`src/lib/questions/index.ts`:
```ts
// 페이지 · Server Action 입구 (서버 전용). 화면 컴포넌트는 타입만 import한다
export { collectUnknowns, QUESTION_LABEL_MAX, type Collected, type UnknownGroup } from './collect';
export { makeQuestions } from './make';
```

- [ ] **Step 6: 가짜 claude 모드**

`src/lib/claude/fake-claude.mjs`에서 `} else if (mode === 'error') {` 바로 앞에 끼운다:
```js
  } else if (mode === 'questions') {
    // '### 확인 필요 목록' 아래 `- 라벨 (N곳)` 줄마다 하나. 짝수 번째는 고객, 홀수 번째는 개발 담당
    const list = input.split('### 확인 필요 목록')[1] ?? '';
    const labels = [...list.matchAll(/^- (.+) \(\d+곳\)$/gm)].map((m) => m[1]);
    const items = labels.map((label, i) => ({ label, kind: i % 2 ? 'owner' : 'customer', role: i % 2 ? '개발' : '', question: `${label}은 어떻게 하나요?` }));
    console.log(JSON.stringify({ is_error: false, structured_output: { items } }));
```

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run src/lib/questions src/lib/claude`
Expected: PASS

- [ ] **Step 8: prompts CLAUDE.md**

`src/lib/prompts/CLAUDE.md` 파일 지도의 `tools/<도구>.ts` 줄 아래에 더한다: `` - `questions.ts` — 확인 질문 (4b): `[확인 필요]` 라벨 → 고객 질문 · 담당자 확인 ``

- [ ] **Step 9: 커밋**
```bash
git add src/lib/prompts/questions.ts src/lib/prompts/CLAUDE.md src/lib/questions src/lib/claude/fake-claude.mjs
git commit -m "feat(bank): 확인 질문 만들기 — 프롬프트 · 검사 · 저장 (#47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 화면 계산 `questionView`

**Files:**
- Create: `src/lib/summary/questions.ts`
- Modify: `src/lib/summary/index.ts` (export만)
- Test: `src/lib/summary/questions.test.ts` (새 파일)

**Interfaces:**
- Consumes: `Collected` · `QUESTION_LABEL_MAX` (`../questions/collect`) · `norm` (`./parse`) · `QUESTION_ROLES` · `QuestionItem` · `QuestionRole` · `QuestionSet` · `Decision` (`../storage/types`)
- Produces (`@/lib/summary`에서 export): `type QuestionLine = QuestionItem & { count: number }` · `type QuestionView = { made: boolean; customer: QuestionLine[]; owner: { role: QuestionRole; items: QuestionLine[] }[]; answered: number; newLabels: number; unknownTotal: number; labelTotal: number; unnamed: number; cut: number; limit: number }` · `questionView(set: QuestionSet | null, collected: Collected, decisions: Decision[]): QuestionView`

- [ ] **Step 1: 실패하는 테스트**

`src/lib/summary/questions.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import type { Decision, QuestionItem, QuestionRole, QuestionSet } from '@/lib/storage/types';

import { questionView } from './questions';

const G = (label: string, count: number) => ({ label, count, examples: [] });
const c = (label: string, question: string): QuestionItem => ({ label, kind: 'customer', role: '', question });
const o = (label: string, role: QuestionRole, question: string): QuestionItem => ({ label, kind: 'owner', role, question });
const set = (items: QuestionItem[], labels = items.map((i) => i.label)): QuestionSet => ({ createdAt: '2026-10-29T00:00:00.000Z', labels, items });
const decision = (question: string): Decision => ({
  id: 'ab12', question, status: 'decided', answer: '성수', reason: '많다', from: 'manual', decidedAt: '2026-10-29T00:00:00.000Z',
});

describe('questionView', () => {
  it('안 만들었으면 수만', () => {
    expect(questionView(null, { groups: [G('a', 3), G('b', 1)], unnamed: 2 }, [])).toEqual({
      made: false, customer: [], owner: [], answered: 0, newLabels: 0, unknownTotal: 6, labelTotal: 2, unnamed: 2, cut: 0, limit: 30,
    });
  });
  it('고객 · 역할 순서로 묶고 지금 수를 붙이며, 문서에서 사라진 라벨은 숨긴다', () => {
    const v = questionView(set([o('a', '법무', 'qa'), c('b', 'qb'), o('c', '개발', 'qc'), o('gone', '기획', 'qg')]), {
      groups: [G('a', 1), G('b', 2), G('c', 3)],
      unnamed: 0,
    }, []);
    expect(v.customer).toEqual([{ ...c('b', 'qb'), count: 2 }]);
    expect(v.owner.map((g) => [g.role, g.items.map((q) => q.question)])).toEqual([['개발', ['qc']], ['법무', ['qa']]]);
    expect(v.newLabels).toBe(0);
  });
  it('같은 질문(공백 무시)의 결정이 있으면 답한 것으로 뺀다', () => {
    const v = questionView(set([c('b', '첫 출시 지역은?')]), { groups: [G('b', 2)], unnamed: 0 }, [decision(' 첫  출시 지역은? ')]);
    expect(v.customer).toEqual([]);
    expect(v.answered).toBe(1);
  });
  it('새 라벨은 30개 안에서만 세고, 31번째부터는 빠진 수', () => {
    const groups = Array.from({ length: 32 }, (_, i) => G(`l${i}`, 40 - i));
    const v = questionView(set([c('l0', 'q')]), { groups, unnamed: 0 }, []);
    expect(v.newLabels).toBe(29);
    expect(v.cut).toBe(2);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/summary/questions.test.ts`
Expected: FAIL — `./questions` 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/summary/questions.ts`:
```ts
// 확인 질문 칸 계산. 이미 읽은 값만으로 — AI 없이 즉시 (요약 판과 같은 원칙)
import { QUESTION_LABEL_MAX, type Collected } from '../questions/collect';
import { QUESTION_ROLES, type Decision, type QuestionItem, type QuestionRole, type QuestionSet } from '../storage/types';

import { norm } from './parse';

export type QuestionLine = QuestionItem & { count: number };
export type QuestionView = {
  made: boolean;
  customer: QuestionLine[];
  /** QUESTION_ROLES 순서, 빈 역할은 뺀다 */
  owner: { role: QuestionRole; items: QuestionLine[] }[];
  /** 같은 질문 문장의 결정이 있는 질문 수 */
  answered: number;
  /** 지금 문서 라벨(앞 30개) 중 만들 때 없던 것 */
  newLabels: number;
  /** [확인 필요] 곳 수 (라벨 없는 것 포함) */
  unknownTotal: number;
  labelTotal: number;
  unnamed: number;
  /** 30개를 넘어 빠진 라벨 수 */
  cut: number;
  limit: number;
};

export function questionView(set: QuestionSet | null, { groups, unnamed }: Collected, decisions: Decision[]): QuestionView {
  const count = new Map(groups.map((g) => [g.label, g.count]));
  const answeredQs = new Set(decisions.map((d) => norm(d.question)));
  const live = (set?.items ?? []).filter((q) => count.has(q.label)).map((q) => ({ ...q, count: count.get(q.label)! }));
  const open = live.filter((q) => !answeredQs.has(norm(q.question)));
  const known = new Set(set?.labels ?? []);
  return {
    made: set !== null,
    customer: open.filter((q) => q.kind === 'customer'),
    owner: QUESTION_ROLES.map((role) => ({ role, items: open.filter((q) => q.kind === 'owner' && q.role === role) })).filter(
      (g) => g.items.length > 0,
    ),
    answered: live.length - open.length,
    newLabels: set ? groups.slice(0, QUESTION_LABEL_MAX).filter((g) => !known.has(g.label)).length : 0,
    unknownTotal: groups.reduce((n, g) => n + g.count, 0) + unnamed,
    labelTotal: groups.length,
    unnamed,
    cut: Math.max(0, groups.length - QUESTION_LABEL_MAX),
    limit: QUESTION_LABEL_MAX,
  };
}
```
`src/lib/summary/index.ts` 맨 아래에 더한다:
```ts
export { questionView, type QuestionLine, type QuestionView } from './questions';
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/summary`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add src/lib/summary/questions.ts src/lib/summary/questions.test.ts src/lib/summary/index.ts
git commit -m "feat(bank): 확인 질문 칸 계산 — 숨김 · 답함 · 새 라벨 (#47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: "확인 질문" 칸 · 만들기 Action

**Files:**
- Modify: `src/app/actions.ts` · `src/app/ideas/[id]/page.tsx` · `src/app/ideas/[id]/idea-detail.tsx` · `src/app/ideas/[id]/doc-card.tsx`
- Create: `src/app/ideas/[id]/questions-panel.tsx`

**Interfaces:**
- Consumes: `makeQuestions` · `collectUnknowns` (`@/lib/questions`) · `getQuestions` (`@/lib/storage`) · `questionView` · `QuestionView` · `QuestionLine` (`@/lib/summary`)
- Produces: `type QuestionsState = { error?: string; savedAt?: number }` · `makeQuestionsAction(id: string): Promise<QuestionsState>` (actions.ts) · `QuestionsPanel` props `{ view: QuestionView; action: () => Promise<QuestionsState>; onBusy: (busy: boolean) => void; disabled: boolean }` · `DocCard`에 `locked: boolean` prop

- [ ] **Step 1: Server Action**

`src/app/actions.ts` import에 `import { makeQuestions } from '@/lib/questions';`를 더하고, `generateDocAction` 아래에 추가:
```ts
export type QuestionsState = { error?: string; savedAt?: number };

// 1분쯤 걸리는 긴 Server Action. 문서 생성과 같은 claude 잠금을 쓴다
export async function makeQuestionsAction(id: string): Promise<QuestionsState> {
  if (isDemo()) return { error: DEMO_MESSAGE };
  try {
    await makeQuestions(id);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] makeQuestions', e);
    return {
      error: e instanceof ChainError || e instanceof StorageError ? e.message : '질문을 만들지 못했어요. 서버 로그를 확인해 주세요.',
    };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}
```
(`ChainError`는 `@/lib/chain`이 `@/lib/claude/run`의 것을 다시 내보내므로 `makeQuestions`가 던지는 것과 같은 클래스다.)

- [ ] **Step 2: 칸 컴포넌트**

`src/app/ideas/[id]/questions-panel.tsx`:
```tsx
'use client';

import { useActionState } from 'react';
import { Box, Button, FlexBox, SectionMessage, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import SectionTitle from '../../_components/section-title';

import type { QuestionLine, QuestionView } from '@/lib/summary';
import type { QuestionsState } from '../../actions';

type Props = {
  view: QuestionView;
  action: () => Promise<QuestionsState>;
  /** 만드는 동안 다른 저장 · 생성 버튼을 막도록 위에 알린다 */
  onBusy: (busy: boolean) => void;
  /** 문서 생성 · 질문 만들기 중이면 막는다 */
  disabled: boolean;
};

const text = (t: string) => (
  <Typography as="p" variant="body2" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

const caption = (t: string) => (
  <Typography as="span" variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

const sub = (t: string) => (
  <Typography as="h3" variant="label1" weight="bold" sx={{ display: 'block', marginBottom: '4px' }}>
    {t}
  </Typography>
);

function Lines({ list }: { list: QuestionLine[] }) {
  return (
    <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
      {list.map((q) => (
        <li key={q.label}>
          {q.question}
          {caption(`${q.label} · ${q.count}곳`)}
        </li>
      ))}
    </Typography>
  );
}

export default function QuestionsPanel({ view, action, onBusy, disabled }: Props) {
  const demo = useDemo();
  const [state, formAction, pending] = useActionState(async (): Promise<QuestionsState> => {
    onBusy(true);
    try {
      return await action();
    } finally {
      onBusy(false);
    }
  }, {});
  if (!view.made && (demo || view.labelTotal === 0)) return null;

  const make = (label: string) => (
    <form action={formAction}>
      <Button type="submit" size="small" loading={pending} disabled={disabled}>
        {label}
      </Button>
    </form>
  );
  const ownerCount = view.owner.reduce((n, g) => n + g.items.length, 0);
  const skipped = [
    view.unnamed > 0 ? `라벨 없는 표시 ${view.unnamed}곳` : '',
    view.cut > 0 ? `${view.limit + 1}번째부터 ${view.cut}개` : '',
  ].filter(Boolean);

  return (
    <Box>
      <SectionTitle>확인 질문</SectionTitle>
      <FlexBox flexDirection="column" gap="12px" alignItems="flex-start">
        {!view.made ? (
          <>
            {text(`[확인 필요] ${view.unknownTotal}곳 · 라벨 ${view.labelTotal}개를 고객에게 물을 것과 담당자에게 확인할 것으로 나눠요. 1분쯤 걸려요.`)}
            {make('질문 목록 만들기')}
          </>
        ) : (
          <>
            {view.customer.length > 0 && (
              <Box>
                {sub(`고객에게 물을 것 (${view.customer.length})`)}
                <Lines list={view.customer} />
              </Box>
            )}
            {view.owner.length > 0 && (
              <Box>
                {sub(`담당자에게 확인할 것 (${ownerCount})`)}
                {view.owner.map((g) => (
                  <Box key={g.role} sx={{ marginTop: '4px' }}>
                    {caption(g.role)}
                    <Lines list={g.items} />
                  </Box>
                ))}
              </Box>
            )}
            {view.customer.length === 0 && view.owner.length === 0 && text('남은 질문이 없어요.')}
            {view.answered > 0 && caption(`답한 것 ${view.answered}개 — 결정 칸에 있어요.`)}
            {view.newLabels > 0 && (
              <FlexBox alignItems="center" gap="8px">
                {text(`새로 생긴 확인 필요 ${view.newLabels}개`)}
                {!demo && make('다시 만들기')}
              </FlexBox>
            )}
          </>
        )}
        {skipped.length > 0 && caption(`질문에서 빠진 것: ${skipped.join(' · ')}`)}
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
      </FlexBox>
    </Box>
  );
}
```

- [ ] **Step 3: DocCard에 `locked`**

`src/app/ideas/[id]/doc-card.tsx`
- Props 타입에 `/** 질문 만들기처럼 다른 긴 작업 중이면 막는다 */ locked: boolean;` 추가
- 함수 인자에 `locked` 추가
- `const blocked = running !== null || genPending;` → `const blocked = running !== null || genPending || locked;`

- [ ] **Step 4: 상세 화면 연결**

`src/app/ideas/[id]/idea-detail.tsx`
- import 추가: `import QuestionsPanel from './questions-panel';` · 타입 import에 `QuestionView` (`@/lib/summary`)와 `QuestionsState` (`../../actions`)
- Props에 추가: `questions: QuestionView;` · `makeQuestionsAction: () => Promise<QuestionsState>;` · 함수 인자에도 추가
- `const [busy, setBusy] = …` 아래에 `const [asking, setAsking] = useState(false);`
- `const generating = (busy ?? running) !== null;` → `const generating = (busy ?? running) !== null || asking;`
- `<IdeaSummary … />` 바로 아래에:
```tsx
      <QuestionsPanel view={questions} action={makeQuestionsAction} onBusy={setAsking} disabled={generating} />
```
- `<DocCard` props에 `locked={asking}` 추가

`src/app/ideas/[id]/page.tsx`
- import: storage에 `getQuestions` 추가 · `import { collectUnknowns } from '@/lib/questions';` · summary import를 `import { questionView, summarize, vocEvidence } from '@/lib/summary';` · actions import에 `makeQuestionsAction` 추가
- `Promise.all` 배열 끝에 `getQuestions(id).catch(() => null),`, 구조 분해에 `questionSet` 추가
- `summary` 계산 아래에: `const questions = questionView(questionSet, collectUnknowns(docs), decisions);`
- `<IdeaDetail` props에 `questions={questions}` · `makeQuestionsAction={makeQuestionsAction.bind(null, id)}` 추가

- [ ] **Step 5: 검사 명령**

Run: `npm run lint && npm run typecheck && npm test`
Expected: 모두 통과

- [ ] **Step 6: 화면 확인 (dev, 임시 데이터)**

1. `hatch-temp` dev 프리뷰(포트 3111, 임시 `HATCH_DATA_DIR`)를 띄운다. 이미 떠 있는 `hatch-demo`가 있으면 끄지 않아도 되지만, `npm run build`와 `.next`를 같이 쓰니 빌드 전엔 dev를 끈다
2. 임시 데이터에 문서가 있는 아이디어를 하나 연다 (없으면 `demo-data/ideas/20261028-1441-n9rp` 폴더를 임시 데이터 `ideas/` 아래로 복사해 쓴다. 사용자 실데이터 `~/Hatch`는 쓰지 않는다)
3. 1280×900에서 확인:
   - 요약 판 아래 "확인 질문" 칸 · 곳 수 · 라벨 수 · "질문 목록 만들기"
   - 누르면 버튼이 로딩, 머리 "수정" · 맥락 · 결정 · 문서 생성 버튼이 막힘
   - 끝나면 고객 / 담당자(역할별) 목록, 줄마다 `라벨 · N곳`, 빠진 것 안내(라벨 없는 표시가 있으면)
   - 기획안 본문을 수정해 새 `[확인 필요: 테스트 라벨]`을 넣고 저장 → "새로 생긴 확인 필요 1개" + "다시 만들기"
   - 결정 직접 추가로 목록의 질문 하나와 같은 문장을 저장 → 그 줄이 빠지고 "답한 것 1개"
4. 375px 폭에서 줄바꿈 깨짐 없는지
5. 콘솔 오류 없음 (`read_console_messages`. 기존 React #418 · `$RS`는 prod 빌드에서만, 무시)

- [ ] **Step 7: 커밋**
```bash
git add src/app/actions.ts "src/app/ideas/[id]"
git commit -m "feat(bank): 아이디어 상세 확인 질문 칸 · 만들기 (#47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 문서 · 기록 (Part 1 마무리)

**Files:**
- Create: `docs/decisions/2026-10-29_확인-질문.md`
- Modify: `docs/decisions/README.md` · `docs/ai-usage/prompts.md` · `CLAUDE.md`

- [ ] **Step 1: why 기록**

`docs/decisions/2026-10-29_확인-질문.md` (`why` 형식, 구현 세부 없이):
```markdown
# [확인 필요]를 누구에게 무엇을 물을지로

**날짜**: 2026-10-29
**관련 파일**: questions-panel.tsx, questions.ts

## What — 무엇이 달라졌나
아이디어 상세에 "확인 질문" 칸이 생겼다. 버튼 한 번으로 문서 곳곳의 [확인 필요]가 "고객에게 물을 것"과 "담당자에게 확인할 것(역할별)" 질문 목록이 된다.

## Why — 왜 필요했나
[확인 필요]는 문서마다 남지만 요약 판에서는 개수만 보였다. 누구에게 무엇을 물어야 하는지는 PO가 문서를 다시 읽고 정리해야 했다 (외부 피드백 7).

## 판단 근거
- 고객 질문인지 내부 확인인지, 질문 문장을 어떻게 쓸지는 판단이라 AI에게 맡기고, 라벨 모으기 · 개수 · 빠진 항목 검사는 코드가 한다.
- 새 도구가 아니라 아이디어 상세 안에 둔다. 피드백이 "새 도구보다 연결"을 권했고, 답은 바로 옆 결정 칸으로 이어진다.
- 라벨 없는 [확인 필요]는 이번엔 뺀다. 하나로 묶으면 서로 다른 질문이 섞여 쓸 수 없는 질문이 된다. 빠진 수는 화면에 알린다.
```
`docs/decisions/README.md` 표 끝에 한 줄: `| 10-29 | [[확인 필요]를 누구에게 무엇을 물을지로](2026-10-29_확인-질문.md) |`

- [ ] **Step 2: 프롬프트 기록**

`docs/ai-usage/prompts.md` §5 표 끝에 한 줄:
`| 4b | `questions.ts` | 새 프롬프트: 라벨마다 정확히 하나 · customer/owner + 역할 · 고객 질문은 유도하지 않는 열린 질문, 담당자 질문은 예/아니오 · 값 · 정한 것은 확인형 | 라벨이 빠지거나 역할이 엉뚱하면 코드 검사가 버리고 "다시 눌러 주세요"로 막는다. 첫 실제 실행 결과(고객 · 담당자 수)를 PR에 적는다 |`

- [ ] **Step 3: 루트 CLAUDE.md 폴더 지도**

`CLAUDE.md` 폴더 지도 표의 `src/lib/storage/` 줄 아래에 더한다: `| \`src/lib/questions/\` | 확인 질문 (모으기 · 검사 · 만들기) | 4b | \`ui-builder\` |`

- [ ] **Step 4: 전체 검증**

dev 서버를 끄고 실행한다.
Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 통과 (테스트 수가 201보다 늘어난다)

- [ ] **Step 5: 커밋**
```bash
git add docs/decisions docs/ai-usage/prompts.md CLAUDE.md
git commit -m "docs(bank): 확인 질문 why · 프롬프트 기록 (#47)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part 2 — 답 적기 → 결정 (#48)

Part 1 PR이 머지된 뒤 main에서 `feat/48-question-answers` 브랜치를 딴다.

### Task 7: 결정 출처 `'question'`

**Files:**
- Modify: `src/lib/storage/types.ts` · `src/lib/storage/decisions.ts` · `src/app/actions.ts` · `src/app/ideas/[id]/decision-form.tsx`
- Test: `src/lib/storage/decisions.test.ts`

**Interfaces:**
- Produces: `Decision.from: 'plan' | 'manual' | 'question'` · `DecisionForm`에 선택 prop `from?: 'plan' | 'question'` (질문을 고정할 때의 출처, 기본 `'plan'`)

- [ ] **Step 1: 실패하는 테스트**

`src/lib/storage/decisions.test.ts`의 `describe('결정', …)` 안 끝에 추가:
```ts
  it("확인 질문에 답한 결정은 from 'question', 모르는 출처는 manual", async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveDecision(idea.id, { ...decided, from: 'question' });
    expect(a.from).toBe('question');
    expect((await listDecisions(idea.id))[0].from).toBe('question');
    const b = await saveDecision(idea.id, { ...decided, from: 'x' as 'manual' });
    expect(b.from).toBe('manual');
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/storage/decisions.test.ts`
Expected: FAIL — `'question'`이 타입에 없어 typecheck 오류 또는 `a.from`이 `'manual'`

- [ ] **Step 3: 구현**

`src/lib/storage/types.ts` `Decision.from`:
```ts
  /** 기획안 질문에 답함 / 직접 추가 / 확인 질문에 답함 */
  from: 'plan' | 'manual' | 'question';
```
`src/lib/storage/decisions.ts`
- `isDecision`: `(d.from === 'plan' || d.from === 'manual')` → `(d.from === 'plan' || d.from === 'manual' || d.from === 'question')`
- `clean`의 반환: `from: input.from === 'plan' ? 'plan' : 'manual'` → `from: input.from === 'plan' || input.from === 'question' ? input.from : 'manual'`

`src/app/actions.ts` `saveDecisionAction`:
```ts
  const from = get('from');
  const values: DecisionInput = {
    question: get('question'),
    status: get('status') === 'deferred' ? 'deferred' : 'decided',
    answer: get('answer'),
    reason: get('reason'),
    from: from === 'plan' || from === 'question' ? from : 'manual',
  };
```
`src/app/ideas/[id]/decision-form.tsx`
- Props에 `/** 질문을 고정할 때의 출처 (기본: 기획안 질문) */ from?: 'plan' | 'question';` 추가, 함수 인자에 `from: fromProp` 추가
- 두 줄을 바꾼다:
```ts
  const fixed = question ?? (initial && initial.from !== 'manual' ? initial.question : undefined);
  const from = question ? (fromProp ?? 'plan') : (initial?.from ?? 'manual');
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/storage && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add src/lib/storage/types.ts src/lib/storage/decisions.ts src/lib/storage/decisions.test.ts src/app/actions.ts "src/app/ideas/[id]/decision-form.tsx"
git commit -m "feat(bank): 결정 출처에 확인 질문 추가 (#48)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 확인 질문 줄마다 "답 적기"

**Files:**
- Modify: `src/app/ideas/[id]/questions-panel.tsx` · `src/app/ideas/[id]/idea-detail.tsx`

**Interfaces:**
- Consumes: `DecisionForm` (`question` · `from="question"` · `action` · `onClose` · `disabled`) · `saveDecisionAction`(id 바인딩된 `(decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>`)
- Produces: `QuestionsPanel`에 prop `saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>`

- [ ] **Step 1: 칸에 답 적기**

`src/app/ideas/[id]/questions-panel.tsx`
- import: `useActionState, useState` · `import DecisionForm from './decision-form';` · 타입 `DecisionState` (`../../actions`)
- Props에 `saveDecision` 추가 (위 Interfaces 모양), 함수 인자에도
- `Lines`를 아래로 바꾼다:
```tsx
function Lines({ list, aside, below }: { list: QuestionLine[]; aside: (q: QuestionLine) => React.ReactNode; below: (q: QuestionLine) => React.ReactNode }) {
  return (
    <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
      {list.map((q) => (
        <li key={q.label}>
          <FlexBox justifyContent="space-between" alignItems="flex-start" gap="8px">
            <span>
              {q.question}
              {caption(`${q.label} · ${q.count}곳`)}
            </span>
            {aside(q)}
          </FlexBox>
          {below(q)}
        </li>
      ))}
    </Typography>
  );
}
```
- 컴포넌트 안 `const demo = useDemo();` 아래에 (훅이므로 early return보다 위):
```tsx
  // 한 번에 폼 하나 (결정 칸과 같은 규칙). 값은 열어 둔 질문의 라벨
  const [opening, setOpening] = useState<string | null>(null);
```
- early return 아래에:
```tsx
  const answer = (q: QuestionLine) =>
    !demo &&
    opening === null && (
      <Button size="small" variant="outlined" color="assistive" onClick={() => setOpening(q.label)} disabled={disabled}>
        답 적기
      </Button>
    );
  const form = (q: QuestionLine) =>
    opening === q.label && (
      <DecisionForm question={q.question} from="question" action={saveDecision.bind(null, null)} onClose={() => setOpening(null)} disabled={disabled} />
    );
```
- `<Lines list={view.customer} />` · `<Lines list={g.items} />` 두 곳을 `<Lines list={…} aside={answer} below={form} />`로

`src/app/ideas/[id]/idea-detail.tsx` — `<QuestionsPanel` props에 `saveDecision={saveDecisionAction}` 추가

- [ ] **Step 2: 검사 명령**

Run: `npm run lint && npm run typecheck && npm test`
Expected: 모두 통과

- [ ] **Step 3: 화면 확인 (dev, 임시 데이터)**

1. Part 1에서 만든 질문이 있는 아이디어를 연다 (임시 데이터)
2. 줄 하나 "답 적기" → 그 줄 아래 폼(질문 고정 · 정함/보류 · 답 · 이유), 다른 줄의 "답 적기"는 사라짐
3. 정함으로 저장 → 줄이 목록에서 빠지고 "답한 것 1개", 요약 판 "결정" 칸 "정한 것 · 보류한 것"에 같은 질문이 나옴
4. 결정 칸에서 그 결정 "수정" → 질문이 고정돼 있음 (입력칸 아님)
5. 결정 칸에서 그 결정 "지우기" → 확인 질문 목록에 다시 나옴
6. 보류로 저장한 질문도 목록에서 빠짐
7. 콘솔 오류 없음

- [ ] **Step 4: 커밋**
```bash
git add "src/app/ideas/[id]/questions-panel.tsx" "src/app/ideas/[id]/idea-detail.tsx"
git commit -m "feat(bank): 확인 질문에 답 적기 → 결정 (#48)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 데모 샘플 · 문서 · 기록 (Part 2 마무리)

**Files:**
- Create: `demo-data/ideas/20261028-1441-n9rp/questions.md` · `docs/decisions/2026-10-29_확인-질문-답.md`
- Modify: `docs/decisions/README.md` · `src/lib/storage/CLAUDE.md`

- [ ] **Step 1: 샘플 만들기 (실제 claude, 임시 데이터)**

1. `demo-data/ideas/20261028-1441-n9rp` 폴더를 `hatch-temp`의 임시 데이터 `ideas/` 아래로 복사한다 (이미 있으면 그대로 쓴다. `~/Hatch`는 쓰지 않는다)
2. `hatch-temp` dev에서 그 아이디어를 열고 "질문 목록 만들기"를 누른다 (실제 `claude -p`, 1분쯤)
3. 만들어진 임시 데이터의 `questions.md`를 `demo-data/ideas/20261028-1441-n9rp/questions.md`로 복사한다
4. 파일을 열어 확인 · 손질한다:
   - 지어낸 개인 · 회사 · 수치 정보가 없을 것 (있으면 그 문장만 일반 표현으로 고친다)
   - `label: 첫 출시 지역` 항목의 `question`을 데모 결정과 똑같이 `첫 출시 지역을 어디로 할 것인가?`로 고친다 → 데모에서 "답한 것 1개"가 보인다
   - `labels` · `items` 수가 맞고 라벨 문자가 문서와 같을 것

- [ ] **Step 2: 데모 화면 확인**

dev를 끄고 `npm run build` 뒤 `hatch-demo`(포트 3110, `HATCH_DEMO=1`, `HATCH_DATA_DIR=demo-data`) 프리뷰로 그 아이디어를 연다
- "확인 질문" 칸에 고객 · 담당자 목록, "답한 것 1개", 만들기 · 다시 만들기 · 답 적기 버튼 없음
- 다른 데모 아이디어(질문 파일 없음)에는 칸이 없음
- 콘솔: 기존 React #418 · `$RS` 말고 새 오류 없음

- [ ] **Step 3: why 기록**

`docs/decisions/2026-10-29_확인-질문-답.md`:
```markdown
# 확인 질문의 답은 결정으로 남긴다

**날짜**: 2026-10-29
**관련 파일**: questions-panel.tsx, decision-form.tsx

## What — 무엇이 달라졌나
확인 질문마다 "답 적기"로 정함 · 보류와 이유를 남기면 결정 칸에 들어가고, 그 질문은 목록에서 "답한 것"으로 빠진다.

## Why — 왜 필요했나
질문 목록만 있으면 답을 얻어도 남길 곳이 없어 다음 문서가 같은 [확인 필요]를 또 남긴다.

## 판단 근거
- 답을 따로 저장하지 않고 이미 있는 결정으로 남긴다. 결정은 다음 기획안 생성과 도구 실행에 들어가므로, 답이 바로 다음 문서에 반영된다.
- 어느 질문에서 나온 결정인지 출처를 남겨, 나중에 결정 칸에서 고칠 때도 질문 문장이 바뀌지 않게 한다.
- 질문지 복사 · 내보내기는 이번에 하지 않는다. 먼저 답이 문서로 돌아오는 고리를 닫는다.
```
`docs/decisions/README.md` 표 끝에 한 줄: `| 10-29 | [확인 질문의 답은 결정으로 남긴다](2026-10-29_확인-질문-답.md) |`

- [ ] **Step 4: storage CLAUDE.md**

결정 줄을 `결정 \`<id>/decisions.md\` (머리말 \`items\` = 결정 목록, \`from\` = plan · manual · question, 고치기 전 판은 \`.history/decisions-<시각>.md\`)`로 바꾼다

- [ ] **Step 5: 전체 검증**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 통과

- [ ] **Step 6: 커밋**
```bash
git add demo-data/ideas/20261028-1441-n9rp/questions.md docs/decisions src/lib/storage/CLAUDE.md
git commit -m "docs(bank): 확인 질문 데모 샘플 · 답 why 기록 (#48)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
