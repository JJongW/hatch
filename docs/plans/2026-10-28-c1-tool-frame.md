# C-1 공통 틀 + PRD 리뷰 위원회 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PO 도구 공통 틀(도구 정의 · 실행기 · 결과 저장 · 화면 틀)을 만들고, 그 위에 PRD 리뷰 위원회를 올려 틀을 검증한다. 이슈 #11.

**Architecture:** B 체인과 같은 모양. 도구마다 `ToolDef`(입력 · 출력 스키마, 프롬프트, 계산, 렌더)를 두고 공통 `runTool`이 입력 문서 확정 → 프롬프트 → `runClaude` → 검사 → 계산 → md 저장을 한다. 결과는 `ideas/<id>/tools/` 또는 `$HATCH_DATA_DIR/tools/`에 쌓인다. 화면은 `/tools/<도구>`의 공통 틀(`_frame/`)에 도구별 입력만 끼운다.

**Tech Stack:** Next.js 16 (App Router, Server Actions, cacheComponents) · zod 4 · gray-matter · vitest · Montage UI · react-markdown

## Global Constraints
- 설계: `docs/specs/2026-10-28-c-po-tools-design.md`. 규칙: 루트 `CLAUDE.md`, `src/app/CLAUDE.md`, `src/app/tools/CLAUDE.md`, `src/lib/prompts/CLAUDE.md`, `src/lib/storage/CLAUDE.md`
- **AI는 판단, 코드는 계산.** 평균 · 개수 · 정렬 · 전후 차이는 코드. AI 점수는 범위 밖이면 자른다
- 프롬프트 문장(제목 문자열 포함)은 `src/lib/prompts/`에만. 다른 곳은 이어 붙이기만
- claude 실행은 `src/lib/claude/run.ts`의 `runClaude`만 (한 번에 하나, `BUSY_MESSAGE`)
- 오류는 `ChainError`(사용자에게 그대로 보여 줄 한국어 한 줄). 문구: "입력 문서를 골라 주세요." · "입력이 너무 길어요 (최대 30,000자)." · "입력 칸을 확인해 주세요." · "이전 결과를 찾을 수 없어요." · "결과 형식이 맞지 않아요. 다시 만들어 주세요."
- 저장은 지우지 않는다. 새 결과는 항상 새 파일
- Next 16: 파일 읽는 페이지는 `await connection()` + `loading.tsx` + `export const instant = false`. `searchParams`는 Promise. Next API는 `node_modules/next/dist/docs/`에서 확인
- UI는 Montage (`montage-ui` 스킬). 컴포넌트 props는 `node_modules/@montage-ui/core/dist/components/<이름>/types.d.ts`에서 확인. `#RRGGBB` · `var(--semantic-…)` 금지
- 화면 · 커밋 문구는 한국어. 커밋 `<type>(tools): 내용 (#11)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

---

### Task 1: 결과 저장 (`src/lib/storage/tools.ts`)

**Files:**
- Create: `src/lib/storage/tools.ts`, `src/lib/storage/tools.test.ts`
- Modify: `src/lib/storage/index.ts` (export 추가), `src/lib/storage/paths.ts` (`toolsDir` 추가), `src/lib/storage/CLAUDE.md` (파일 지도 · 저장 형식 한 줄씩)

**Interfaces:**
- Produces:
  ```ts
  export type ToolResult = {
    id: string; tool: string; ideaId: string | null; createdAt: string;
    source: string;          // DocKey 또는 'pasted'
    sourceHash: string; prevId: string | null;
    data: unknown;           // 계산 결과 (도구가 해석)
    body: string;            // md 본문
  };
  export async function saveToolResult(r: Omit<ToolResult, 'id' | 'createdAt'>): Promise<string>; // 새 id
  export async function listToolResults(tool: string, ideaId: string | null): Promise<ToolResult[]>; // 최신순
  export async function getToolResult(ideaId: string | null, id: string): Promise<ToolResult | null>;
  export const isValidResultId: (id: string) => boolean;
  ```

- [ ] **Step 1: 실패하는 테스트**

```ts
// src/lib/storage/tools.test.ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea } from './ideas';
import { getToolResult, isValidResultId, listToolResults, saveToolResult } from './tools';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const base = { tool: 'prd-review', source: 'prd', sourceHash: 'abc123def456', prevId: null, data: { overall: 3.5 }, body: '## 요약\n좋다' };

describe('tool results', () => {
  it('아이디어 결과는 ideas/<id>/tools/ 에 저장되고 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const id = await saveToolResult({ ...base, ideaId: idea.id });
    expect(isValidResultId(id)).toBe(true);
    const files = await fs.readdir(path.join(dir, 'ideas', idea.id, 'tools'));
    expect(files).toEqual([`${id}.md`]);
    const r = await getToolResult(idea.id, id);
    expect(r).toMatchObject({ id, tool: 'prd-review', ideaId: idea.id, source: 'prd', prevId: null, data: { overall: 3.5 }, body: '## 요약\n좋다' });
  });
  it('붙여넣기 결과는 $HATCH_DATA_DIR/tools/ 에 저장된다', async () => {
    const id = await saveToolResult({ ...base, ideaId: null, source: 'pasted' });
    expect(await fs.readdir(path.join(dir, 'tools'))).toEqual([`${id}.md`]);
    expect((await getToolResult(null, id))?.source).toBe('pasted');
  });
  it('목록은 도구별 · 최신순', async () => {
    const a = await saveToolResult({ ...base, ideaId: null });
    await new Promise((r) => setTimeout(r, 1100)); // 시각(초)이 id에 들어간다
    const b = await saveToolResult({ ...base, ideaId: null, prevId: a });
    await saveToolResult({ ...base, ideaId: null, tool: 'voc' });
    const list = await listToolResults('prd-review', null);
    expect(list.map((r) => r.id)).toEqual([b, a]);
    expect(list[0].prevId).toBe(a);
  });
  it('결과가 없으면 빈 목록 · null', async () => {
    expect(await listToolResults('prd-review', null)).toEqual([]);
    expect(await getToolResult(null, 'prd-review-20261028T000000-abcd')).toBeNull();
  });
  it('잘못된 id · 도구 이름은 거절', async () => {
    expect(isValidResultId('../etc/passwd')).toBe(false);
    await expect(getToolResult(null, '../x')).rejects.toThrow();
    await expect(saveToolResult({ ...base, ideaId: null, tool: '../x' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/storage/tools.test.ts` → FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
// src/lib/storage/paths.ts 에 추가
export const toolsDir = (ideaId: string | null) =>
  ideaId === null ? path.join(dataDir(), 'tools') : path.join(ideaDir(ideaId), 'tools');
```

```ts
// src/lib/storage/tools.ts
import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { assertValidId } from './ids';
import { isMissing, toolsDir } from './paths';

export type ToolResult = {
  id: string;
  tool: string;
  ideaId: string | null;
  createdAt: string;
  /** DocKey 또는 'pasted' */
  source: string;
  sourceHash: string;
  prevId: string | null;
  /** 계산 결과. 도구가 해석한다 (재리뷰 · 다음 라운드가 읽음) */
  data: unknown;
  body: string;
};

export const TOOL_RESULT_VERSION = 1;
const TOOL_PATTERN = /^[a-z][a-z-]*$/;
const RESULT_PATTERN = /^[a-z][a-z-]*-\d{8}T\d{6}-[0-9a-f]{4}$/;

export const isValidResultId = (id: string) => RESULT_PATTERN.test(id);

function assertTool(tool: string) {
  if (!TOOL_PATTERN.test(tool)) throw new Error(`잘못된 도구 이름이에요: ${tool}`);
}
function assertResultId(id: string) {
  if (!isValidResultId(id)) throw new Error(`잘못된 결과 id예요: ${id}`);
}
const dirOf = (ideaId: string | null) => {
  if (ideaId !== null) assertValidId(ideaId);
  return toolsDir(ideaId);
};
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); // 20261028T091500

function parse(raw: string, id: string, ideaId: string | null): ToolResult | null {
  try {
    const { data: f, content } = matter(raw);
    return {
      id,
      tool: String(f.tool ?? ''),
      ideaId,
      createdAt: String(f.createdAt ?? ''),
      source: String(f.source ?? ''),
      sourceHash: String(f.sourceHash ?? ''),
      prevId: typeof f.prevId === 'string' ? f.prevId : null,
      data: typeof f.data === 'string' ? JSON.parse(f.data) : null,
      body: content.trim(),
    };
  } catch {
    return null; // 깨진 파일은 건너뛴다
  }
}

export async function saveToolResult(r: Omit<ToolResult, 'id' | 'createdAt'>): Promise<string> {
  assertTool(r.tool);
  const dir = dirOf(r.ideaId);
  await fs.mkdir(dir, { recursive: true });
  const id = `${r.tool}-${stamp()}-${crypto.randomBytes(2).toString('hex')}`;
  const front = {
    tool: r.tool,
    createdAt: new Date().toISOString(),
    source: r.source,
    sourceHash: r.sourceHash,
    ...(r.prevId ? { prevId: r.prevId } : {}),
    version: TOOL_RESULT_VERSION,
    data: JSON.stringify(r.data), // YAML 특수문자 걱정 없이 한 줄 JSON으로
  };
  // 본문이 `---`로 시작해도 머리말로 읽히지 않게 머리말만 만들고 본문은 이어 붙인다 (docs.ts와 같음)
  await fs.writeFile(path.join(dir, `${id}.md`), matter.stringify('', front) + '\n' + r.body.trim() + '\n', { flag: 'wx' });
  return id;
}

export async function getToolResult(ideaId: string | null, id: string): Promise<ToolResult | null> {
  assertResultId(id);
  const raw = await fs.readFile(path.join(dirOf(ideaId), `${id}.md`), 'utf8').catch((e) => {
    if (isMissing(e)) return null;
    throw e;
  });
  return raw === null ? null : parse(raw, id, ideaId);
}

export async function listToolResults(tool: string, ideaId: string | null): Promise<ToolResult[]> {
  assertTool(tool);
  let files: string[];
  try {
    files = await fs.readdir(dirOf(ideaId));
  } catch (e) {
    if (isMissing(e)) return [];
    throw e;
  }
  const ids = files
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .filter((id) => isValidResultId(id) && id.startsWith(`${tool}-`) && /^\d{8}T/.test(id.slice(tool.length + 1)))
    .sort()
    .reverse(); // id에 시각이 들어 있어 이름순 = 시간순
  const results = await Promise.all(ids.map((id) => getToolResult(ideaId, id)));
  return results.filter((r): r is ToolResult => r !== null);
}
```

`src/lib/storage/index.ts`에 추가:
```ts
export { getToolResult, isValidResultId, listToolResults, saveToolResult, type ToolResult } from './tools';
```

- [ ] **Step 4: 통과 확인** — `npx vitest run src/lib/storage/tools.test.ts` → PASS
- [ ] **Step 5:** `src/lib/storage/CLAUDE.md` 파일 지도에 `tools.ts — PO 도구 결과 저장 · 목록`, 저장 형식에 `도구 결과: <id>/tools/<도구>-<시각>-<rand>.md (붙여넣기는 $HATCH_DATA_DIR/tools/), 머리말 data = 계산 결과 JSON` 한 줄씩 (30줄 이하 유지)
- [ ] **Step 6: 커밋** — `feat(tools): 도구 결과 저장 (#11)`

---

### Task 2: 도구 실행기 (`src/lib/tools`)

**Files:**
- Create: `src/lib/claude/schema.ts`, `src/lib/tools/types.ts`, `src/lib/tools/run.ts`, `src/lib/tools/run.test.ts`, `src/lib/tools/index.ts`
- Modify: `src/lib/chain/generate.ts` (`toClaudeSchema`를 `@/lib/claude/schema`에서 가져와 다시 export — 기존 테스트 import 유지), `src/lib/prompts/context.ts` (`TOOL_RULES` · `SOURCE_HEADING` 추가)

**Interfaces:**
- Consumes: Task 1 `saveToolResult` · `getToolResult` · `ToolResult` (from `@/lib/storage`), `getDocs` · `hashOf` · `DocKey`, `runClaude` · `isClaudeBusy` · `BUSY_MESSAGE` · `ChainError` (from `@/lib/claude/run`)
- Produces:
  ```ts
  // src/lib/tools/types.ts
  export type ToolKey = 'prd-review' | 'voc' | 'metrics' | 'negotiation';
  export type ToolDef<In, Out, Res> = {
    key: ToolKey;
    label: string;               // 네비바 · 페이지 제목
    description: string;         // 페이지 설명 한 줄
    accepts: DocKey[];           // 받는 아이디어 문서, 첫 번째가 기본
    continueLabel?: string;      // 결과에서 이어 실행하는 버튼 (재리뷰 · 다음 라운드)
    inputSchema: z.ZodType<In>;  // 폼 문자열 → 도구 입력. 메시지는 한국어로
    outputSchema: z.ZodType<Out>;
    prompt: string;
    promptInput: (input: In, prev: Res | null) => string; // '' 가능
    compute: (out: Out, input: In, prev: Res | null) => Res;
    render: (res: Res) => string;
  };
  export type AnyToolDef = ToolDef<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  export type ToolSource = { ideaId: string; docKey: DocKey } | { pasted: string };

  // src/lib/tools/run.ts
  export const MAX_SOURCE_CHARS = 30_000;
  export async function runTool(tool: AnyToolDef, args: { source: ToolSource; input: Record<string, string>; prevId?: string | null }): Promise<{ resultId: string; ideaId: string | null }>;

  // src/lib/tools/index.ts — 밖에서 import하는 유일한 입구
  export const TOOLS: Partial<Record<ToolKey, AnyToolDef>>; // Task 3에서 prd-review 등록
  export { runTool, MAX_SOURCE_CHARS } ; export { ChainError, isClaudeBusy } ; export type { ToolKey, ToolSource, AnyToolDef }
  ```

- [ ] **Step 1: `toClaudeSchema` 옮기기** — `src/lib/claude/schema.ts`로 함수 본문 그대로 이동 (`import { z } from 'zod'`). `generate.ts`는 `import { toClaudeSchema } from '@/lib/claude/schema';` + `export { toClaudeSchema };` 로 바꾼다. `npx vitest run src/lib/chain` → PASS

- [ ] **Step 2: 프롬프트 상수** — `src/lib/prompts/context.ts`에 추가:

```ts
/** 모든 PO 도구 앞에 붙는 공통 규칙 */
export const TOOL_RULES = `너는 한국 IT 회사의 시니어 PO를 돕는 동료다. 아래 입력 문서만 근거로 판단한다.
- 입력에 없는 사실은 지어내지 말고 "[확인 필요: ○○]"로 남긴다.
- 평균 · 합계 · 개수 · 순위 계산은 하지 않는다. 판단과 이유만 칸에 채운다.
- 문장은 짧은 한국어 평서문. 마크다운 문법은 쓰지 않는다 (형식은 코드가 만든다).`;

export const SOURCE_HEADING = '### 입력 문서';
```

- [ ] **Step 3: 실패하는 테스트** — `src/lib/tools/run.test.ts`. 테스트 전용 도구로 실행기만 검증 (fake-claude `ok` 모드는 `{ echo: <프롬프트>, args }`를 돌려준다)

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createIdea, getToolResult, hashOf, listToolResults, saveDoc } from '@/lib/storage';

import { runTool } from './run';
import type { ToolDef } from './types';

const here = path.dirname(fileURLToPath(import.meta.url));
let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
  process.env.HATCH_CLAUDE_BIN = path.join(here, '../claude/fake-claude.mjs');
  process.env.FAKE_CLAUDE = 'ok';
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
  delete process.env.HATCH_CLAUDE_BIN;
  delete process.env.FAKE_CLAUDE;
});

// fake-claude ok 모드 출력 { echo, args } 를 그대로 받는 시험용 도구
const echoTool: ToolDef<{ note: string }, { echo: string }, { echo: string; prevEcho: string | null }> = {
  key: 'prd-review',
  label: '시험',
  description: '시험',
  accepts: ['prd', 'plan'],
  inputSchema: z.object({ note: z.string().max(5, '메모는 5자까지예요.').default('') }),
  outputSchema: z.object({ echo: z.string() }),
  prompt: '## 할 일\n시험',
  promptInput: (i, prev) => `### 메모\n${i.note}${prev ? '\n이전 있음' : ''}`,
  compute: (o, _i, prev) => ({ echo: o.echo, prevEcho: prev?.echo ?? null }),
  render: (r) => `## 결과\n${r.echo.length}자`,
};

describe('runTool', () => {
  it('아이디어 문서를 입력으로 실행해 결과를 저장한다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'prd', '## 배경\nPRD 본문', { sourceHash: hashOf('x') });
    const { resultId, ideaId } = await runTool(echoTool, { source: { ideaId: idea.id, docKey: 'prd' }, input: { note: 'hi' } });
    expect(ideaId).toBe(idea.id);
    const r = await getToolResult(idea.id, resultId);
    expect(r?.source).toBe('prd');
    expect(r?.sourceHash).toBe(hashOf('## 배경\nPRD 본문'));
    const prompt = (r?.data as { echo: string }).echo;
    expect(prompt).toContain('PRD 본문');
    expect(prompt).toContain('### 메모\nhi');
    expect(prompt.indexOf('## 할 일')).toBeLessThan(prompt.indexOf('PRD 본문'));
  });
  it('붙여넣기 입력은 전역 tools 폴더에, prevId로 이전 결과를 넘긴다', async () => {
    const first = await runTool(echoTool, { source: { pasted: '회사 PRD' }, input: {} });
    expect(first.ideaId).toBeNull();
    const second = await runTool(echoTool, { source: { pasted: '고친 PRD' }, input: {}, prevId: first.resultId });
    const r = await getToolResult(null, second.resultId);
    expect(r?.prevId).toBe(first.resultId);
    expect((r?.data as { prevEcho: string | null }).prevEcho).toContain('회사 PRD');
    expect(await listToolResults('prd-review', null)).toHaveLength(2);
  });
  it('입력 문서가 없거나 비면 거절', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(runTool(echoTool, { source: { ideaId: idea.id, docKey: 'prd' }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
    await expect(runTool(echoTool, { source: { pasted: '   ' }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
  });
  it('받지 않는 문서 종류는 거절', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(runTool(echoTool, { source: { ideaId: idea.id, docKey: 'spec' }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
  });
  it('너무 긴 입력 · 잘못된 입력 칸 · 없는 이전 결과', async () => {
    await expect(runTool(echoTool, { source: { pasted: 'a'.repeat(30_001) }, input: {} })).rejects.toThrow('입력이 너무 길어요 (최대 30,000자).');
    await expect(runTool(echoTool, { source: { pasted: 'a' }, input: { note: '여섯글자입니다' } })).rejects.toThrow('메모는 5자까지예요.');
    await expect(runTool(echoTool, { source: { pasted: 'a' }, input: {}, prevId: 'prd-review-20261028T000000-abcd' })).rejects.toThrow('이전 결과를 찾을 수 없어요.');
  });
  it('AI 출력 형식이 틀리면 저장하지 않는다', async () => {
    process.env.FAKE_CLAUDE = 'plan'; // echo 칸이 없는 출력
    await expect(runTool(echoTool, { source: { pasted: 'a' }, input: {} })).rejects.toThrow('결과 형식이 맞지 않아요');
    expect(await listToolResults('prd-review', null)).toEqual([]);
  });
});
```

- [ ] **Step 4: 실패 확인** — `npx vitest run src/lib/tools` → FAIL

- [ ] **Step 5: 구현** — `types.ts`는 Interfaces 그대로. `run.ts`:

```ts
import 'server-only';

import { BUSY_MESSAGE, ChainError, isClaudeBusy, runClaude } from '@/lib/claude/run';
import { toClaudeSchema } from '@/lib/claude/schema';
import { INPUT_HEADING, SOURCE_HEADING, TOOL_RULES } from '@/lib/prompts/context';
import { getDocs, getToolResult, hashOf, saveToolResult } from '@/lib/storage';

import type { AnyToolDef, ToolSource } from './types';

export const MAX_SOURCE_CHARS = 30_000;

async function readSource(tool: AnyToolDef, source: ToolSource) {
  if ('pasted' in source) return { text: source.pasted.trim(), label: 'pasted', ideaId: null };
  if (!tool.accepts.includes(source.docKey)) return { text: '', label: source.docKey, ideaId: source.ideaId };
  const doc = (await getDocs(source.ideaId)).find((d) => d.key === source.docKey);
  return { text: doc?.content?.trim() ?? '', label: source.docKey, ideaId: source.ideaId };
}

/** 입력 문서 확정 → 입력 칸 검사 → 프롬프트 → claude → 형식 검사 → 계산 → md 저장 */
export async function runTool(
  tool: AnyToolDef,
  { source, input, prevId = null }: { source: ToolSource; input: Record<string, string>; prevId?: string | null },
) {
  const { text, label, ideaId } = await readSource(tool, source);
  if (!text) throw new ChainError('입력 문서를 골라 주세요.');
  if (text.length > MAX_SOURCE_CHARS) throw new ChainError('입력이 너무 길어요 (최대 30,000자).');

  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) throw new ChainError(parsed.error.issues[0]?.message || '입력 칸을 확인해 주세요.');

  let prev = null;
  if (prevId) {
    const r = await getToolResult(ideaId, prevId).catch(() => null);
    if (!r || r.tool !== tool.key) throw new ChainError('이전 결과를 찾을 수 없어요.');
    prev = r.data;
  }

  if (isClaudeBusy()) throw new ChainError(BUSY_MESSAGE);
  const prompt = [TOOL_RULES, tool.prompt, INPUT_HEADING, `${SOURCE_HEADING}\n${text}`, tool.promptInput(parsed.data, prev)]
    .filter(Boolean)
    .join('\n\n');
  const raw = await runClaude({ prompt, jsonSchema: toClaudeSchema(tool.outputSchema) });
  const out = tool.outputSchema.safeParse(raw);
  if (!out.success) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');

  const res = tool.compute(out.data, parsed.data, prev);
  const resultId = await saveToolResult({
    tool: tool.key, ideaId, source: label, sourceHash: hashOf(text), prevId, data: res, body: tool.render(res),
  });
  return { resultId, ideaId };
}
```

> zod 기본 메시지는 영어다. 도구의 `inputSchema`는 모든 제약에 한국어 메시지를 붙인다 (`.max(n, '…')`). 메시지가 비면 '입력 칸을 확인해 주세요.'

`index.ts`:
```ts
import type { AnyToolDef, ToolKey } from './types';

/** 등록된 도구. 도구가 하나씩 완성될 때 여기에 추가한다 */
export const TOOLS: Partial<Record<ToolKey, AnyToolDef>> = {};

export { MAX_SOURCE_CHARS, runTool } from './run';
export { ChainError, isClaudeBusy } from '@/lib/claude/run';
export type { AnyToolDef, ToolKey, ToolSource } from './types';
```

- [ ] **Step 6: 통과 확인** — `npx vitest run src/lib/tools src/lib/chain` → PASS
- [ ] **Step 7: 커밋** — `feat(tools): 도구 실행기 runTool (#11)`

---

### Task 3: PRD 리뷰 위원회 정의 (`src/lib/tools/prd-review/`)

**Files:**
- Create: `src/lib/tools/prd-review/index.ts`, `src/lib/tools/prd-review/compute.ts`, `src/lib/tools/prd-review/prd-review.test.ts`, `src/lib/prompts/tools/prd-review.ts`
- Modify: `src/lib/tools/index.ts` (`TOOLS['prd-review']` 등록), `src/lib/claude/fake-claude.mjs` (`prd-review` 모드)

**Interfaces:**
- Consumes: Task 2 `ToolDef`
- Produces: `prdReviewTool: ToolDef<Record<string, never>, PrdReviewOutput, PrdReviewResult>`, 상수 `REVIEWERS` · `CRITERIA`, 함수 `computePrdReview` · `renderPrdReview`

**판단 vs 계산**
| AI | 코드 |
| --- | --- |
| 위원(개발 · 디자인 · 마케팅 · CS)별 반론(문제 · 심각도 · 제안), 기준 5개 점수 · 이유, 요약 | 점수 1~5 정수로 자르기, 심각도 1~3으로 자르기, 위원별 평균 · 기준별 평균 · 전체 평균(소수 1자리), 심각도별 개수, 반론 정렬(심각도 높은 순), 이전 결과와의 차이 |

- [ ] **Step 1: 프롬프트** — `src/lib/prompts/tools/prd-review.ts`

```ts
/** PRD 리뷰 위원회. 출력 스키마: prdReviewOutputSchema (src/lib/tools/prd-review/index.ts) */
export const PRD_REVIEW_PROMPT = `## 할 일
입력 문서(PRD)를 위원 4명이 각자 관점에서 리뷰한다. 위원: 개발 · 디자인 · 마케팅 · CS.
- reviews: 위원마다 하나. reviewer는 위원 이름
- objections를 먼저 쓴다: 이 문서로 일을 시작하면 막히는 점. issue(무엇이 문제인지) · severity(1 사소함 · 2 고치는 게 좋음 · 3 이대로면 출시 못 함) · suggestion(어떻게 고칠지)
- 반론이 없으면 빈 배열. 칭찬은 쓰지 않는다
- scores: 기준 5개 모두. criterion · score(1~5 정수) · reason(한 문장)
- 기준: 명확성 · 실현 가능성 · 측정 가능성 · 사용자 가치 · 위험 대응
- summary: 위원회 결론 두세 문장
- 이전 리뷰가 있으면 그 반론이 고쳐졌는지 보고, 고쳐진 반론은 다시 쓰지 않는다`;

export const PRD_REVIEW_PREV_HEADING = '### 이전 리뷰의 반론';
```

- [ ] **Step 2: 실패하는 테스트** — `src/lib/tools/prd-review/prd-review.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { computePrdReview, renderPrdReview } from './compute';
import { prdReviewTool } from './index';

const scores = (s: number) =>
  ['명확성', '실현 가능성', '측정 가능성', '사용자 가치', '위험 대응'].map((criterion) => ({ criterion, score: s, reason: '이유' }));

const out = {
  reviews: [
    { reviewer: '개발', objections: [{ issue: 'API 미정', severity: 3, suggestion: '정한다' }, { issue: '용어', severity: 1, suggestion: '통일' }], scores: scores(3) },
    { reviewer: '디자인', objections: [{ issue: '빈 상태', severity: 2, suggestion: '그린다' }], scores: scores(4) },
    { reviewer: '마케팅', objections: [], scores: scores(9) }, // 범위 밖 → 5
    { reviewer: 'CS', objections: [{ issue: '문의 경로', severity: 7, suggestion: '추가' }], scores: scores(0) }, // 7 → 3, 0 → 1
  ],
  summary: '보완 후 진행',
};

describe('prdReviewTool', () => {
  it('출력 스키마: 정상 통과 · 모르는 위원 실패 · JSON Schema 변환', () => {
    expect(prdReviewTool.outputSchema.safeParse(out).success).toBe(true);
    expect(prdReviewTool.outputSchema.safeParse({ ...out, reviews: [{ ...out.reviews[0], reviewer: '법무' }] }).success).toBe(false);
    expect(z.toJSONSchema(prdReviewTool.outputSchema)).toMatchObject({ type: 'object' });
  });
  it('점수 · 심각도를 범위로 자르고 평균을 낸다', () => {
    const r = computePrdReview(prdReviewTool.outputSchema.parse(out), null);
    expect(r.reviewers.map((v) => v.average)).toEqual([3, 4, 5, 1]);
    expect(r.criteria['명확성']).toBe(3.3); // (3+4+5+1)/4 = 3.25 → 3.3
    expect(r.overall).toBe(3.3);
    expect(r.severityCounts).toEqual({ 1: 1, 2: 1, 3: 2 });
    expect(r.reviewers[0].objections.map((o) => o.severity)).toEqual([3, 1]); // 높은 순
    expect(r.prev).toBeNull();
  });
  it('빠진 위원은 응답 없음(null)이고 평균에서 빠진다', () => {
    const r = computePrdReview(prdReviewTool.outputSchema.parse({ ...out, reviews: [out.reviews[0]] }), null);
    expect(r.reviewers.map((v) => v.reviewer)).toEqual(['개발', '디자인', '마케팅', 'CS']);
    expect(r.reviewers[1].average).toBeNull();
    expect(r.overall).toBe(3);
  });
  it('재리뷰: 이전 결과의 점수를 prev로 남기고 render가 차이를 보여 준다', () => {
    const before = computePrdReview(prdReviewTool.outputSchema.parse({ ...out, reviews: out.reviews.map((v) => ({ ...v, scores: scores(2) })) }), null);
    const after = computePrdReview(prdReviewTool.outputSchema.parse(out), before);
    expect(after.prev?.overall).toBe(2);
    const md = renderPrdReview(after);
    expect(md).toContain('전체 평균 3.3 (이전 2 → +1.3)');
  });
  it('render: 요약 → 반론 → 점수 순서, 반론 없는 위원 표시', () => {
    const md = renderPrdReview(computePrdReview(prdReviewTool.outputSchema.parse(out), null));
    const order = ['## 요약', '## 반론', '### 개발 위원', '- **심각도 3** API 미정 — 제안: 정한다', '### 마케팅 위원\n- 반론 없음', '## 점수', '- 전체 평균 3.3'];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
  });
  it('promptInput: 이전 결과가 있으면 이전 반론을 넣는다', () => {
    const before = computePrdReview(prdReviewTool.outputSchema.parse(out), null);
    expect(prdReviewTool.promptInput({}, null)).toBe('');
    expect(prdReviewTool.promptInput({}, before)).toContain('- [개발] API 미정');
  });
});
```

- [ ] **Step 3: 실패 확인** — `npx vitest run src/lib/tools/prd-review` → FAIL

- [ ] **Step 4: 구현** — `compute.ts`

```ts
export const REVIEWERS = ['개발', '디자인', '마케팅', 'CS'] as const;
export const CRITERIA = ['명확성', '실현 가능성', '측정 가능성', '사용자 가치', '위험 대응'] as const;
export type Reviewer = (typeof REVIEWERS)[number];
export type Criterion = (typeof CRITERIA)[number];
type Severity = 1 | 2 | 3;

export type PrdReviewOutput = {
  reviews: { reviewer: Reviewer; objections: { issue: string; severity: number; suggestion: string }[]; scores: { criterion: Criterion; score: number; reason: string }[] }[];
  summary: string;
};
type Snapshot = { overall: number | null; criteria: Record<Criterion, number | null>; reviewers: Record<Reviewer, number | null> };
export type PrdReviewResult = {
  summary: string;
  reviewers: { reviewer: Reviewer; average: number | null; scores: Record<Criterion, { score: number; reason: string } | null>; objections: { issue: string; severity: Severity; suggestion: string }[] }[];
  criteria: Record<Criterion, number | null>;
  overall: number | null;
  severityCounts: Record<Severity, number>;
  prev: Snapshot | null;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? round1(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

export function computePrdReview(out: PrdReviewOutput, prev: PrdReviewResult | null): PrdReviewResult {
  const reviewers = REVIEWERS.map((reviewer) => {
    const r = out.reviews.find((x) => x.reviewer === reviewer); // 같은 위원이 둘이면 첫 번째
    const scores = Object.fromEntries(
      CRITERIA.map((c) => {
        const s = r?.scores.find((x) => x.criterion === c);
        return [c, s ? { score: clamp(s.score, 1, 5), reason: s.reason } : null];
      }),
    ) as Record<Criterion, { score: number; reason: string } | null>;
    const objections = (r?.objections ?? [])
      .map((o) => ({ ...o, severity: clamp(o.severity, 1, 3) as Severity }))
      .sort((a, b) => b.severity - a.severity);
    return { reviewer, average: r ? avg(CRITERIA.map((c) => scores[c]?.score ?? null)) : null, scores, objections };
  });
  const criteria = Object.fromEntries(CRITERIA.map((c) => [c, avg(reviewers.map((v) => v.scores[c]?.score ?? null))])) as Record<Criterion, number | null>;
  const severityCounts: Record<Severity, number> = { 1: 0, 2: 0, 3: 0 };
  for (const v of reviewers) for (const o of v.objections) severityCounts[o.severity] += 1;
  return {
    summary: out.summary,
    reviewers,
    criteria,
    overall: avg(reviewers.map((v) => v.average)),
    severityCounts,
    prev: prev && {
      overall: prev.overall,
      criteria: prev.criteria,
      reviewers: Object.fromEntries(prev.reviewers.map((v) => [v.reviewer, v.average])) as Record<Reviewer, number | null>,
    },
  };
}

const fmt = (n: number | null) => (n === null ? '응답 없음' : String(n));
const diff = (now: number | null, before: number | null | undefined) => {
  if (before === undefined || now === null || before === null) return '';
  const d = round1(now - before);
  return ` (이전 ${before} → ${d >= 0 ? '+' : ''}${d})`;
};

export function renderPrdReview(r: PrdReviewResult) {
  const objections = r.reviewers.map(
    (v) =>
      `### ${v.reviewer} 위원\n` +
      (v.objections.length ? v.objections.map((o) => `- **심각도 ${o.severity}** ${o.issue} — 제안: ${o.suggestion}`).join('\n') : '- 반론 없음'),
  );
  const scoreLines = r.reviewers.map(
    (v) =>
      `### ${v.reviewer} 위원 · 평균 ${fmt(v.average)}${diff(v.average, r.prev?.reviewers[v.reviewer])}\n` +
      CRITERIA.map((c) => (v.scores[c] ? `- ${c} ${v.scores[c]!.score} — ${v.scores[c]!.reason}` : `- ${c} 응답 없음`)).join('\n'),
  );
  return [
    `## 요약\n${r.summary}`,
    `## 반론\n심각도 3 · ${r.severityCounts[3]}건 / 2 · ${r.severityCounts[2]}건 / 1 · ${r.severityCounts[1]}건`,
    ...objections,
    `## 점수\n- 전체 평균 ${fmt(r.overall)}${diff(r.overall, r.prev?.overall)}\n` +
      CRITERIA.map((c) => `- ${c} ${fmt(r.criteria[c])}${diff(r.criteria[c], r.prev?.criteria[c])}`).join('\n'),
    ...scoreLines,
  ].join('\n\n');
}
```

`index.ts`:
```ts
import { z } from 'zod';

import { PRD_REVIEW_PREV_HEADING, PRD_REVIEW_PROMPT } from '@/lib/prompts/tools/prd-review';

import type { ToolDef } from '../types';

import { computePrdReview, CRITERIA, renderPrdReview, REVIEWERS, type PrdReviewOutput, type PrdReviewResult } from './compute';

export const prdReviewOutputSchema = z.object({
  reviews: z.array(
    z.object({
      reviewer: z.enum(REVIEWERS),
      objections: z.array(z.object({ issue: z.string().min(1), severity: z.number(), suggestion: z.string().min(1) })),
      scores: z.array(z.object({ criterion: z.enum(CRITERIA), score: z.number(), reason: z.string().min(1) })),
    }),
  ),
  summary: z.string().min(1),
}) satisfies z.ZodType<PrdReviewOutput>;

export const prdReviewTool: ToolDef<Record<string, never>, PrdReviewOutput, PrdReviewResult> = {
  key: 'prd-review',
  label: 'PRD 리뷰 위원회',
  description: '개발 · 디자인 · 마케팅 · CS 위원이 반론부터 내고 기준별로 채점해요. 고친 판을 다시 돌리면 전후 차이를 보여 줘요.',
  accepts: ['prd', 'spec', 'plan'],
  continueLabel: '고친 판 다시 리뷰',
  inputSchema: z.object({}).strip() as z.ZodType<Record<string, never>>,
  outputSchema: prdReviewOutputSchema,
  prompt: PRD_REVIEW_PROMPT,
  promptInput: (_i, prev) =>
    prev
      ? `${PRD_REVIEW_PREV_HEADING}\n${prev.reviewers.flatMap((v) => v.objections.map((o) => `- [${v.reviewer}] ${o.issue}`)).join('\n') || '- 없음'}`
      : '',
  compute: (out, _i, prev) => computePrdReview(out, prev),
  render: renderPrdReview,
};
```

`src/lib/tools/index.ts`의 `TOOLS`에 `'prd-review': prdReviewTool` 등록.

- [ ] **Step 5: 가짜 claude 모드** — `fake-claude.mjs`에 `else if (mode === 'prd-review')` 추가: 위 테스트의 `out`과 같은 모양(위원 4명, 기준 5개 점수 3~4, 반론 몇 개)을 `structured_output`으로 출력. 화면 확인용
- [ ] **Step 6: 통과 확인** — `npx vitest run src/lib/tools` → PASS
- [ ] **Step 7: 커밋** — `feat(tools): PRD 리뷰 위원회 정의 · 계산 (#11)`

---

### Task 4: 화면 틀 + PRD 리뷰 페이지 + 네비바

**Files:**
- Move: `src/app/ideas/[id]/doc-markdown.tsx` → `src/app/_components/doc-markdown.tsx`, `src/app/ideas/[id]/use-refresh-while.ts` → `src/app/_components/use-refresh-while.ts` (2곳 넘게 쓰임. `git mv` 후 import 경로 수정)
- Create: `src/app/tools/_frame/load.ts` (서버), `src/app/tools/_frame/tool-frame.tsx` (클라이언트), `src/app/tools/loading.tsx`, `src/app/tools/prd-review/page.tsx`
- Modify: `src/app/actions.ts` (`runToolAction`), `src/app/_components/side-nav.tsx` (도구 링크)

**Interfaces:**
- Consumes: `TOOLS` · `runTool` · `ChainError` · `isClaudeBusy` · `ToolKey` (from `@/lib/tools`), `listIdeas` · `getDocs` · `listToolResults` · `getToolResult` · `isValidId` · `isValidResultId` · `DOC_STEPS` (from `@/lib/storage`)
- Produces (C-2~4가 그대로 쓴다):
  ```ts
  // src/app/actions.ts
  export type ToolActionState = { error?: string; resultId?: string; ideaId?: string | null };
  export async function runToolAction(key: ToolKey, prev: ToolActionState, formData: FormData): Promise<ToolActionState>;
  // 폼 칸: mode('idea'|'pasted') · ideaId · docKey · pasted · prevId — 나머지 칸은 전부 도구 입력(input)으로

  // src/app/tools/_frame/load.ts
  export async function loadToolPage(key: ToolKey, searchParams: Promise<{ idea?: string; result?: string }>): Promise<ToolFrameData>;
  export type ToolFrameData = {
    tool: { key: ToolKey; label: string; description: string; continueLabel: string | null };
    ideas: { id: string; title: string; docs: { key: DocKey; label: string }[] }[]; // accepts 순서, 있는 문서만
    ideaId: string | null;   // ?idea= (유효하지 않으면 null)
    results: { id: string; createdAt: string; source: string }[]; // 이 아이디어(또는 붙여넣기)의 이 도구 결과, 최신순
    current: { id: string; body: string } | null; // ?result= 또는 최신 결과
    busy: boolean;           // isClaudeBusy()
  };

  // src/app/tools/_frame/tool-frame.tsx
  export default function ToolFrame(props: ToolFrameData & { run: (prev: ToolActionState, fd: FormData) => Promise<ToolActionState>; inputFields?: React.ReactNode }): JSX.Element;
  ```

- [ ] **Step 1: 컴포넌트 옮기기** — 위 두 파일 `git mv`, `idea-detail.tsx` · `doc-card.tsx` import 수정. `npm run typecheck` → 통과

- [ ] **Step 2: `runToolAction`** (`src/app/actions.ts`)

```ts
import { ChainError as ToolError, runTool, TOOLS, type ToolKey } from '@/lib/tools';

export type ToolActionState = { error?: string; resultId?: string; ideaId?: string | null };
const FRAME_FIELDS = new Set(['mode', 'ideaId', 'docKey', 'pasted', 'prevId']);

// 1~2분 걸리는 긴 Server Action. 도구 입력 칸은 FRAME_FIELDS 밖의 문자열 칸 전부
export async function runToolAction(key: ToolKey, _prev: ToolActionState, formData: FormData): Promise<ToolActionState> {
  const tool = TOOLS[key];
  if (!tool) return { error: '아직 쓸 수 없는 도구예요.' };
  const get = (k: string) => String(formData.get(k) ?? '');
  const source =
    get('mode') === 'pasted' ? { pasted: get('pasted') } : { ideaId: get('ideaId'), docKey: get('docKey') as DocKey };
  if ('ideaId' in source && !isValidId(source.ideaId)) return { error: '입력 문서를 골라 주세요.' };
  const input: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (!FRAME_FIELDS.has(k) && !k.startsWith('$') && typeof v === 'string') input[k] = v;
  });
  try {
    const { resultId, ideaId } = await runTool(tool, { source, input, prevId: get('prevId') || null });
    revalidatePath(`/tools/${key}`);
    return { resultId, ideaId };
  } catch (e) {
    if (!(e instanceof ToolError)) console.error('[hatch] runTool', e);
    return { error: e instanceof ToolError || e instanceof StorageError ? e.message : '도구를 실행하지 못했어요. 서버 로그를 확인해 주세요.' };
  }
}
```
(`isValidId`는 `@/lib/storage`에서 import 추가)

- [ ] **Step 3: `load.ts`** (서버 전용, `import 'server-only'`)
  - `const { idea, result } = await searchParams`
  - `ideaId` = `idea`가 `isValidId` 통과하고 `listIdeas()`에 있으면 그 값, 아니면 `null`
  - `ideas` = `listIdeas()`의 각 아이디어에 `getDocs(id)`를 읽어 `tool.accepts` 순서로 `content !== null`인 문서만 `{ key, label }` (label은 `DOC_STEPS`에서)
  - `results` = `listToolResults(key, ideaId)` → `{ id, createdAt, source }`
  - `current` = `result`가 `isValidResultId`면 `getToolResult(ideaId, result)`, 아니면 `results[0]`. 없으면 null. `{ id, body }`
  - `busy` = `isClaudeBusy()`
  - 도구가 `TOOLS`에 없으면 `notFound()`

- [ ] **Step 4: `tool-frame.tsx`** (`'use client'`, Montage)
  - 레이아웃 (위에서 아래, 섹션 사이 24–32px): `PageHeader(tool.label, tool.description)` → **입력 문서** → **도구 입력**(`inputFields`, 없으면 생략) → **실행 버튼** → 오류 `SectionMessage` → **결과**(`DocMarkdown`) + 이어 실행 버튼 → **지난 결과** 목록
  - 입력 문서: `SegmentedControl`(또는 `Tab`)로 "아이디어 문서" / "직접 붙여넣기". 상태는 `mode` 숨은 칸
    - 아이디어 문서: `Select`로 아이디어 고르기 → 고르면 `router.push('?idea=<id>')` (결과 목록이 그 아이디어로 바뀜). 문서 `Select`는 그 아이디어의 `docs` (첫 번째 기본). 문서가 하나도 없으면 "이 도구가 받는 문서(PRD 등)가 아직 없어요." 안내
    - 붙여넣기: `TextArea` (`name="pasted"`, 최대 30,000자 안내). 붙여넣기 모드로 바꾸면 `router.push('?')` (붙여넣기 결과 목록)
  - 실행: `useActionState(run, {})`. 성공(`resultId`)하면 `router.push('?idea=<ideaId ?? ''>&result=<resultId>')` (ideaId 없으면 `?result=`만). pending이면 `Loading` + "위원회가 읽는 중이에요 (1~2분)" · 버튼 `disabled`. `busy`면 버튼을 막고 "다른 문서를 만드는 중이에요" + `useRefreshWhile(busy)`
  - 이어 실행(`continueLabel`이 있고 `current`가 있을 때): 같은 폼을 `prevId=current.id`로 제출하는 두 번째 submit 버튼 (`name="prevId" value={current.id}`). 입력 문서는 지금 고른 것 그대로 — 사용자가 문서를 고친 뒤(아이디어 상세에서 편집 또는 새로 붙여넣기) 누른다
  - 지난 결과: `ListCell`(as `Link`) 목록, `?idea=…&result=<id>`로 이동. 표시: 만든 시각(서버에서 `toLocaleString('ko-KR')`로 포맷해 넘긴다 — hydration 차이) · 출처 라벨(문서 이름 또는 "붙여넣기") · 지금 보는 결과는 `selected`
  - 날짜 포맷은 `load.ts`에서 문자열로 만들어 넘긴다 (`createdAt` 칸에 표시용 문자열)

- [ ] **Step 5: 페이지** — `src/app/tools/prd-review/page.tsx`

```tsx
import { connection } from 'next/server';

import { runToolAction } from '../../actions';
import { loadToolPage } from '../_frame/load';
import ToolFrame from '../_frame/tool-frame';

// 로컬 전용 · 항상 요청 시 렌더 (docs: route-segment-config/instant)
export const instant = false;

export default async function PrdReviewPage({ searchParams }: { searchParams: Promise<{ idea?: string; result?: string }> }) {
  await connection();
  const data = await loadToolPage('prd-review', searchParams);
  return <ToolFrame {...data} run={runToolAction.bind(null, 'prd-review')} />;
}
```
`src/app/tools/loading.tsx`는 `src/app/ideas/loading.tsx`와 같은 모양으로.

- [ ] **Step 6: 네비바** — `side-nav.tsx`의 `TOOLS`를 `{ label, href, ready }[]`로: `{ label: 'PRD 리뷰 위원회', href: '/tools/prd-review', ready: true }`, 나머지 셋은 `/tools/voc` · `/tools/metrics` · `/tools/negotiation`, `ready: false`. `ready`면 `ListCell as={Link} href selected={isActive(href)}`, 아니면 지금처럼 비활성 + "준비 중". 주석 "C 단계에서 링크를 연결한다"는 "도구가 완성되면 ready: true"로

- [ ] **Step 7: 검증** — `npm run lint && npm run typecheck && npm test && npm run build`. 그다음 임시 `HATCH_DATA_DIR` + `HATCH_CLAUDE_BIN=src/lib/claude/fake-claude.mjs` + `FAKE_CLAUDE=prd-review`로 `npm run dev`:
  - 네비바 "PRD 리뷰 위원회" → 페이지 열림, 콘솔 오류 없음
  - 붙여넣기로 실행 → 결과 렌더 · 지난 결과 1개 · URL에 `result=`
  - "고친 판 다시 리뷰" → 새 결과, 점수에 "(이전 … → …)" 표시, 지난 결과 2개
  - 아이디어 선택(PRD 있는 것) → 문서 Select에 PRD 기본 → 실행 → `ideas/<id>/tools/`에 파일
  - 빈 붙여넣기로 실행 → "입력 문서를 골라 주세요."
- [ ] **Step 8: 커밋** — `feat(tools): 공통 틀 화면 · PRD 리뷰 페이지 · 네비바 (#11)`

---

### Task 5: 문서 갱신

**Files:** `src/app/tools/CLAUDE.md`, `.claude/skills/new-po-tool/SKILL.md`, `src/lib/prompts/CLAUDE.md`, 루트 `CLAUDE.md`, `src/app/CLAUDE.md`

- [ ] **Step 1:** `src/app/tools/CLAUDE.md` 공통 틀 절을 실제 코드로: `_frame/load.ts`(`loadToolPage`) · `_frame/tool-frame.tsx`(`ToolFrame`, `inputFields`) · `actions.ts`의 `runToolAction`(프레임 칸 외 = 도구 입력) · 도구 정의는 `src/lib/tools/<도구>/` · 등록은 `src/lib/tools/index.ts`의 `TOOLS` + 네비바 `ready: true`. 30줄 이하
- [ ] **Step 2:** `new-po-tool` 스킬 "공통 틀은 C 첫 PR에서 만든다" 문단을 지우고, 순서를 실제 경로로: ① 판단 vs 계산 표 ② `src/lib/tools/<도구>/compute.ts` + 테스트 먼저 ③ `index.ts`에 `ToolDef`(한국어 메시지 inputSchema) ④ `src/lib/prompts/tools/<도구>.ts` ⑤ `TOOLS` 등록 · fake-claude 모드 ⑥ `src/app/tools/<도구>/page.tsx` (prd-review 페이지 복사 + `inputFields`) ⑦ 네비바 `ready: true` ⑧ 검증 · 실제 실행 · 리뷰. 패턴 파일: `src/lib/tools/prd-review/`
- [ ] **Step 3:** prompts CLAUDE.md 파일 지도에 `context.ts`의 `TOOL_RULES` · `SOURCE_HEADING`, 루트 CLAUDE.md "지금 단계"를 "C-1 진행: 공통 틀 + PRD 리뷰 위원회"로, `src/app/CLAUDE.md` 파일 지도에 `_components/`의 `doc-markdown` · `use-refresh-while`, `tools/_frame/`
- [ ] **Step 4: 커밋** — `docs(tools): 공통 틀 문서 · new-po-tool 스킬 갱신 (#11)`

---

### Task 6: 실제 claude 실행 확인

- [ ] 임시 `HATCH_DATA_DIR`(B-2 때 만든 PRD가 있는 아이디어 복사 가능)로 `npm run dev` (fake 변수 없이)
- [ ] 아이디어 PRD로 PRD 리뷰 실행 → 위원 4명 반론 · 점수 · 요약이 그럴듯한지, 칭찬만 있거나 평균을 AI가 쓰지 않았는지 확인. 품질 문제는 프롬프트로만 고친다
- [ ] PRD를 아이디어 상세에서 조금 고친 뒤 "고친 판 다시 리뷰" → 전후 차이 표시 확인
- [ ] 붙여넣기 실행 1회
- [ ] 콘솔 · 서버 오류 없음. 끝나면 dev 서버 종료, `.env.local` 원래대로

### Task 7: 리뷰 · PR

- [ ] 브랜치 전체 `hatch-reviewer` → 지적 반영 → 검증 명령 재실행
- [ ] push → PR `feat(tools): C-1 공통 틀 + PRD 리뷰 위원회 (#11)` (closes #11, 라벨 `area:tools` `type:feat`, 마일스톤 "C. PO 도구 4종"). 검증 · 실제 실행 결과 · 리뷰 결과 · 화면 캡처 설명
- [ ] **머지는 사용자 승인 후**
