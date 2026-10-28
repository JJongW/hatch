# B-1. 체인 바탕 + 기획안 단계 실행 계획

> spec: [docs/specs/2026-10-28-b-doc-chain-design.md](../specs/2026-10-28-b-doc-chain-design.md) · 이슈 #5 · 브랜치 `feat/5-chain-base`
> 실행: superpowers:subagent-driven-development(권장) 또는 executing-plans. 체크박스는 실제로 한 뒤에만 체크

**Goal:** 상세 화면에서 "기획안 만들기"를 누르면 맥의 `claude -p`가 기획안을 만들어 `plan.md`로 저장하고, 편집 · 다시 만들기 · "앞 문서가 바뀌었어요"까지 동작한다.

**Architecture:** Server Action → `src/lib/chain/generate.ts`(조립 · 검사 · 저장) → `src/lib/claude/run.ts`(`claude -p` 실행). 단계 정의는 `src/lib/chain/steps/<key>.ts`(zod 스키마 + render), 프롬프트 문장은 `src/lib/prompts/`. 저장은 `src/lib/storage/docs.ts`.

**Tech Stack:** Next.js 16.4.3 · Montage 4.1.5 · zod 4.6.7 · react-markdown 10.1.0 · gray-matter · vitest

## Global Constraints

- `claude -p --output-format json --json-schema <schema> --tools "" --no-session-persistence` (+ `--model $HATCH_CLAUDE_MODEL`). 프롬프트는 stdin. 결과는 `structured_output`
- 실행 파일 `HATCH_CLAUDE_BIN`(기본 `claude`) · 동시 실행 1개 · 5분 초과 시 종료 · 작업 폴더는 빈 임시 폴더
- 프롬프트 문자열은 `src/lib/prompts/`에만. 상수만 export (함수 없음)
- 지우는 동작 없음. 덮어쓸 때는 `<id>/.history/<key>-<시각>.md`로 이동
- 오류는 `ChainError`(한국어 한 줄, spec §6 문구 그대로). stderr는 서버 로그에만, 프롬프트 본문은 로그 금지
- Next 16: 파일 읽는 페이지는 `await connection()` + `loading.tsx`. Montage 파일은 `'use client'`
- 커밋 `<type>(chain): 내용 (#5)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- spec과 다른 점 1개: 앞 단계(`from`)는 `ChainStep`이 아니라 storage의 `DOC_STEPS`에 둔다 (stale 계산을 storage가 해야 해서). spec §3 표기만 다름, 동작 같음

---

### Task 1: 문서 저장 (storage 확장, TDD)

**Files:**
- Create: `src/lib/storage/paths.ts`, `src/lib/storage/docs.ts`, `src/lib/storage/docs.test.ts`
- Modify: `src/lib/storage/types.ts`, `src/lib/storage/ideas.ts`(경로 함수 · getDocs 이동), `src/lib/storage/index.ts`, `src/lib/storage/ideas.test.ts`(curriculum → roadmap), `src/lib/storage/CLAUDE.md`

**Produces:**
- `DocKey = 'plan' | 'roadmap' | 'prd' | 'spec' | 'dev-prompt' | 'design-prompt'`
- `DOC_STEPS: { key, label, file, from: DocKey | 'idea' }[]`
- `Doc = { key, label, file, from, content: string | null, stale: boolean }` (content는 머리말 뺀 본문)
- `ideaSource(idea: Pick<Idea,'title'|'memo'>): string` = `` `# ${title}\n\n${memo}`.trim() ``
- `hashOf(text: string): string` = sha256 hex 앞 12자 (입력은 `trim()`)
- `getDocs(id): Promise<Doc[]>` · `saveDoc(id, key, body, { sourceHash }): Promise<void>` · `updateDocBody(id, key, body): Promise<void>`
- `getRunning(id): Promise<{ key: DocKey; startedAt: string } | null>` · `markRunning(id, key)` · `clearRunning(id)`

- [ ] **Step 1: types.ts 바꾸기**

```ts
export type DocKey = 'plan' | 'roadmap' | 'prd' | 'spec' | 'dev-prompt' | 'design-prompt';

export type DocStep = { key: DocKey; label: string; file: string; from: DocKey | 'idea' };

export type Doc = DocStep & {
  /** 머리말을 뺀 본문. 파일이 없으면 null */
  content: string | null;
  /** 만들 때의 입력 해시 ≠ 지금 앞 문서 해시 */
  stale: boolean;
};

/** 문서 체인 순서. 각 단계는 from(앞 단계)을 입력으로 만든다. */
export const DOC_STEPS: ReadonlyArray<DocStep> = [
  { key: 'plan', label: '기획안', file: 'plan.md', from: 'idea' },
  { key: 'roadmap', label: '개발 로드맵', file: 'roadmap.md', from: 'plan' },
  { key: 'prd', label: 'PRD', file: 'prd.md', from: 'roadmap' },
  { key: 'spec', label: '기능명세', file: 'spec.md', from: 'prd' },
  { key: 'dev-prompt', label: '개발 프롬프트', file: 'dev-prompt.md', from: 'spec' },
  { key: 'design-prompt', label: '디자인 프롬프트', file: 'design-prompt.md', from: 'spec' },
];

export const DOC_FILE_VERSION = 1;
```
(`Idea`, `IDEA_FILE_VERSION`은 그대로)

- [ ] **Step 2: paths.ts로 경로 함수 분리** — `ideas.ts`의 `dataDir` · `ideasDir` · `ideaDir` · `ideaFile` · `isMissing`를 그대로 옮겨 export, `ideas.ts`는 import. `getDocs`는 `docs.ts`로 옮긴다 (`listIdeasWithProgress`는 `docs.ts`의 `getDocs` import)

- [ ] **Step 3: 실패하는 테스트** `src/lib/storage/docs.test.ts` (임시 폴더 · `beforeEach`/`afterEach`는 `ideas.test.ts`와 같게)

```ts
describe('getDocs', () => {
  it('머리말을 빼고 본문만, 앞 문서가 그대로면 stale=false', async () => {
    const idea = await createIdea({ title: '동네 클래스', memo: '주말' });
    await saveDoc(idea.id, 'plan', '# 기획안', { sourceHash: hashOf(ideaSource(idea)) });
    const plan = (await getDocs(idea.id)).find((d) => d.key === 'plan')!;
    expect(plan.content).toBe('# 기획안');
    expect(plan.stale).toBe(false);
  });

  it('아이디어를 고치면 기획안이 stale', async () => {
    const idea = await createIdea({ title: '동네 클래스', memo: '' });
    await saveDoc(idea.id, 'plan', '# 기획안', { sourceHash: hashOf(ideaSource(idea)) });
    await updateIdea(idea.id, { memo: '평일 저녁도' });
    expect((await getDocs(idea.id))[0].stale).toBe(true);
  });

  it('머리말 없이 손으로 쓴 문서는 stale=false', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', idea.id, 'roadmap.md'), '# 손으로');
    const roadmap = (await getDocs(idea.id)).find((d) => d.key === 'roadmap')!;
    expect(roadmap).toMatchObject({ content: '# 손으로', stale: false });
  });
});

describe('saveDoc · updateDocBody', () => {
  it('덮어쓰기 전 이전 판을 .history로 옮긴다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '첫 판', { sourceHash: 'a' });
    await saveDoc(idea.id, 'plan', '둘째 판', { sourceHash: 'b' });
    const history = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatch(/^plan-\d{8}T\d{6}/);
  });

  it('편집은 본문만 바꾸고 sourceHash는 유지', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '원본', { sourceHash: hashOf(ideaSource(idea)) });
    await updateDocBody(idea.id, 'plan', '고친 본문');
    const plan = (await getDocs(idea.id))[0];
    expect(plan).toMatchObject({ content: '고친 본문', stale: false });
  });

  it('없는 문서 편집은 StorageError', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(updateDocBody(idea.id, 'plan', 'y')).rejects.toThrow(StorageError);
  });
});

describe('running', () => {
  it('표시 → 읽기 → 지우기', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await markRunning(idea.id, 'plan');
    expect(await getRunning(idea.id)).toMatchObject({ key: 'plan' });
    await clearRunning(idea.id);
    expect(await getRunning(idea.id)).toBeNull();
  });

  it('10분 넘은 표시는 무시', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const old = new Date(Date.now() - 11 * 60_000).toISOString();
    await fs.writeFile(path.join(dir, 'ideas', idea.id, '.running.json'), JSON.stringify({ key: 'plan', startedAt: old }));
    expect(await getRunning(idea.id)).toBeNull();
  });
});
```
그리고 `ideas.test.ts`의 getDocs 순서 기대값을 `['plan', 'roadmap', 'prd', 'spec', 'dev-prompt', 'design-prompt']`로.

- [ ] **Step 4: 실패 확인** — `npm test` → docs.test.ts가 import 실패로 FAIL

- [ ] **Step 5: docs.ts 구현**

```ts
import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { DOC_FILE_VERSION, DOC_STEPS, type Doc, type DocKey, type Idea } from './types';

const RUNNING_TTL_MS = 10 * 60_000;

export const ideaSource = (idea: Pick<Idea, 'title' | 'memo'>) => `# ${idea.title}\n\n${idea.memo}`.trim();
export const hashOf = (text: string) => crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 12);

const stepOf = (key: DocKey) => DOC_STEPS.find((s) => s.key === key)!;
const docPath = (id: string, key: DocKey) => path.join(ideaDir(id), stepOf(key).file);
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); // 20261028T091500

async function readRaw(id: string, key: DocKey) {
  return fs.readFile(docPath(id, key), 'utf8').catch((e) => {
    if (isMissing(e)) return null;
    throw e;
  });
}

/** 덮어쓰기 전에 이전 판을 .history/로 (지우지 않는다) */
async function keepHistory(id: string, key: DocKey) {
  const from = docPath(id, key);
  const exists = await fs.stat(from).then(() => true, () => false);
  if (!exists) return;
  const dir = path.join(ideaDir(id), '.history');
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(from, path.join(dir, `${key}-${stamp()}-${crypto.randomBytes(2).toString('hex')}.md`));
}

export async function getDocs(id: string): Promise<Doc[]> {
  assertValidId(id);
  const idea = await getIdea(id);
  const parsed = await Promise.all(
    DOC_STEPS.map(async (step) => {
      const raw = await readRaw(id, step.key);
      if (raw === null) return { step, body: null, sourceHash: undefined };
      const { data, content } = matter(raw);
      return { step, body: content.trim(), sourceHash: typeof data.sourceHash === 'string' ? data.sourceHash : undefined };
    }),
  );
  const bodyOf = (from: DocKey | 'idea') =>
    from === 'idea' ? (idea ? ideaSource(idea) : null) : (parsed.find((p) => p.step.key === from)?.body ?? null);

  return parsed.map(({ step, body, sourceHash }) => {
    const source = bodyOf(step.from);
    const stale = body !== null && sourceHash !== undefined && source !== null && sourceHash !== hashOf(source);
    return { ...step, content: body, stale };
  });
}

export async function saveDoc(id: string, key: DocKey, body: string, meta: { sourceHash: string }) {
  assertValidId(id);
  await keepHistory(id, key);
  const front = { generatedAt: new Date().toISOString(), sourceHash: meta.sourceHash, version: DOC_FILE_VERSION };
  await fs.writeFile(docPath(id, key), matter.stringify(body.trim() + '\n', front));
}

export async function updateDocBody(id: string, key: DocKey, body: string) {
  assertValidId(id);
  const raw = await readRaw(id, key);
  if (raw === null) throw new StorageError('문서를 찾을 수 없어요. 먼저 만들어 주세요.');
  const { data } = matter(raw);
  await keepHistory(id, key);
  await fs.writeFile(docPath(id, key), matter.stringify(body.trim() + '\n', data));
}

const runningFile = (id: string) => path.join(ideaDir(id), '.running.json');

export async function getRunning(id: string): Promise<{ key: DocKey; startedAt: string } | null> {
  assertValidId(id);
  const raw = await fs.readFile(runningFile(id), 'utf8').catch(() => null);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    if (Date.now() - Date.parse(r.startedAt) > RUNNING_TTL_MS) return null;
    return { key: r.key, startedAt: r.startedAt };
  } catch {
    return null;
  }
}

export async function markRunning(id: string, key: DocKey) {
  assertValidId(id);
  await fs.writeFile(runningFile(id), JSON.stringify({ key, startedAt: new Date().toISOString() }));
}

/** 표시 파일 하나를 치운다 (생성 상태 표시일 뿐 사용자 데이터가 아님) */
export async function clearRunning(id: string) {
  assertValidId(id);
  await fs.rm(runningFile(id), { force: true });
}
```
`index.ts`에 `getDocs`(docs.ts에서), `saveDoc`, `updateDocBody`, `getRunning`, `markRunning`, `clearRunning`, `hashOf`, `ideaSource`, 타입 `DocStep` export 추가.

- [ ] **Step 6: 통과 확인** — `npm test` 전부 PASS, `npm run typecheck`
  (화면 `idea-detail.tsx`가 `doc.stale`를 아직 안 써도 타입은 통과해야 한다)
- [ ] **Step 7: storage CLAUDE.md** — 파일 지도에 `paths.ts` · `docs.ts`, 저장 형식에 문서 머리말 · `.history/` · `.running.json` 한 줄씩 (30줄 이하 유지)
- [ ] **Step 8: 커밋** `feat(chain): 문서 저장 · 이력 · stale · 생성 중 표시 (#5)`

---

### Task 2: claude 실행기 (TDD)

**Files:**
- Create: `src/lib/claude/run.ts`, `src/lib/claude/run.test.ts`, `src/lib/claude/fake-claude.mjs`(테스트 전용, 실행 권한), `src/lib/claude/CLAUDE.md`

**Produces:**
- `class ChainError extends Error {}`
- `runClaude(opts: { prompt: string; jsonSchema: object; timeoutMs?: number }): Promise<unknown>` — `structured_output` 반환
- `isClaudeBusy(): boolean`

- [ ] **Step 1: 가짜 실행 파일** `src/lib/claude/fake-claude.mjs` (`chmod +x`)

```js
#!/usr/bin/env node
// 테스트용 가짜 claude. FAKE_CLAUDE 값으로 동작을 고른다.
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const mode = process.env.FAKE_CLAUDE ?? 'ok';
  if (mode === 'ok') {
    const args = process.argv.slice(2);
    console.log(JSON.stringify({ is_error: false, structured_output: { echo: input, args } }));
  } else if (mode === 'error') {
    console.log(JSON.stringify({ is_error: true, result: 'Not logged in' }));
  } else if (mode === 'crash') {
    console.error('boom');
    process.exit(2);
  } else if (mode === 'slow') {
    setTimeout(() => {}, 60_000);
  }
});
```

- [ ] **Step 2: 실패하는 테스트** `run.test.ts`

```ts
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ChainError, runClaude } from './run';

const schema = { type: 'object' };

beforeEach(() => {
  process.env.HATCH_CLAUDE_BIN = path.join(__dirname, 'fake-claude.mjs');
});
afterEach(() => {
  delete process.env.HATCH_CLAUDE_BIN;
  delete process.env.FAKE_CLAUDE;
  delete process.env.HATCH_CLAUDE_MODEL;
});

describe('runClaude', () => {
  it('프롬프트는 stdin, 도구 없음 · 스키마 인자를 넘기고 structured_output을 돌려준다', async () => {
    const out = (await runClaude({ prompt: '안녕', jsonSchema: schema })) as { echo: string; args: string[] };
    expect(out.echo).toBe('안녕');
    expect(out.args).toEqual(expect.arrayContaining(['-p', '--tools', '', '--no-session-persistence', '--json-schema']));
  });

  it('HATCH_CLAUDE_MODEL이 있으면 --model', async () => {
    process.env.HATCH_CLAUDE_MODEL = 'sonnet';
    const out = (await runClaude({ prompt: 'x', jsonSchema: schema })) as { args: string[] };
    expect(out.args).toEqual(expect.arrayContaining(['--model', 'sonnet']));
  });

  it('is_error면 로그인 안내', async () => {
    process.env.FAKE_CLAUDE = 'error';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema })).rejects.toThrow('로그인 상태');
  });

  it('비정상 종료도 로그인 안내 (ChainError)', async () => {
    process.env.FAKE_CLAUDE = 'crash';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema })).rejects.toThrow(ChainError);
  });

  it('실행 파일이 없으면 설치 안내', async () => {
    process.env.HATCH_CLAUDE_BIN = '/nope/claude';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema })).rejects.toThrow('claude를 찾을 수 없어요');
  });

  it('시간 초과', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, timeoutMs: 300 })).rejects.toThrow('5분 안에');
  });

  it('동시에 두 번이면 두 번째는 거부', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    const first = runClaude({ prompt: 'x', jsonSchema: schema, timeoutMs: 500 });
    await expect(runClaude({ prompt: 'y', jsonSchema: schema })).rejects.toThrow('다른 문서를 만드는 중');
    await expect(first).rejects.toThrow();
  });
});
```

- [ ] **Step 3: 실패 확인** — `npx vitest run src/lib/claude` → FAIL (모듈 없음)

- [ ] **Step 4: run.ts 구현**

```ts
import 'server-only';

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** 화면에 그대로 보여 줘도 되는 체인 오류 (한국어 한 줄) */
export class ChainError extends Error {}

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const LOGIN_HINT = 'Claude 실행에 실패했어요. 터미널에서 `claude`를 한 번 실행해 로그인 상태를 확인해 주세요.';

let busy = false;
export const isClaudeBusy = () => busy;

export async function runClaude({
  prompt,
  jsonSchema,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  prompt: string;
  jsonSchema: object;
  timeoutMs?: number;
}): Promise<unknown> {
  if (busy) throw new ChainError('다른 문서를 만드는 중이에요. 끝난 뒤 다시 눌러 주세요.');
  busy = true;
  // 프로젝트 CLAUDE.md를 읽지 않도록 빈 폴더에서 실행
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-claude-'));
  try {
    const stdout = await spawnClaude(prompt, jsonSchema, cwd, timeoutMs);
    let res: { is_error?: boolean; structured_output?: unknown };
    try {
      res = JSON.parse(stdout);
    } catch {
      throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    }
    if (res.is_error) throw new ChainError(LOGIN_HINT);
    if (res.structured_output === undefined) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    return res.structured_output;
  } finally {
    busy = false;
    await fs.rm(cwd, { recursive: true, force: true }); // 방금 만든 빈 임시 폴더
  }
}

function spawnClaude(prompt: string, jsonSchema: object, cwd: string, timeoutMs: number) {
  const bin = process.env.HATCH_CLAUDE_BIN?.trim() || 'claude';
  const model = process.env.HATCH_CLAUDE_MODEL?.trim();
  const args = [
    '-p',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(jsonSchema),
    '--tools', '',
    '--no-session-persistence',
    ...(model ? ['--model', model] : []),
  ];

  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new ChainError('5분 안에 끝나지 않았어요. 다시 만들어 주세요.'));
    }, timeoutMs);

    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        e.code === 'ENOENT'
          ? new ChainError('claude를 찾을 수 없어요. Claude Code가 설치돼 있는지 확인해 주세요.')
          : new ChainError(LOGIN_HINT),
      );
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(out);
      console.error(`[hatch] claude 종료 코드 ${code}: ${err.slice(0, 500)}`); // stderr만, 프롬프트는 남기지 않음
      reject(new ChainError(LOGIN_HINT));
    });
    child.stdin.end(prompt);
  });
}
```
(시간 초과 메시지 문구는 `timeoutMs`와 관계없이 spec 문구 그대로)

- [ ] **Step 5: 통과 확인** — `npx vitest run src/lib/claude` PASS
- [ ] **Step 6: `src/lib/claude/CLAUDE.md`** (10줄 안팎): 역할 · 명령 인자 · env 2개 · 보안 규칙(도구 없음, 로그에 프롬프트 금지) · 호출은 `src/lib/chain/generate.ts`에서만
- [ ] **Step 7: 커밋** `feat(chain): claude -p 실행기 (#5)`

---

### Task 3: 전역 CLAUDE.md 영향 확인 (수동, 결과를 기록)

spec §2 확인 항목. 생성 결과에 사용자 전역 지시(`~/.claude/CLAUDE.md`)가 섞이는지 본다.

- [ ] **Step 1:** 빈 임시 폴더에서 실행
```bash
cd "$(mktemp -d)" && echo "지금 받은 지시 가운데 '작업 규칙 (모든 프로젝트 공통)'이라는 제목이 보이면 그 첫 항목 제목을, 없으면 none을 answer에 적어." | claude -p --output-format json --json-schema '{"type":"object","properties":{"answer":{"type":"string"}},"required":["answer"]}' --tools "" --no-session-persistence | python3 -c "import json,sys;print(json.load(sys.stdin)['structured_output'])"
```
- [ ] **Step 2:** `none`이면 그대로. 보이면 같은 명령에 `--setting-sources project` 를 붙여 다시 확인 → 사라지면 `run.ts` args에 추가 + 테스트 기대값에 추가. 그래도 보이면 `--system-prompt` 로 기본 지시를 바꾸는 방안을 PR 본문에 남기고 그대로 진행 (기획 문서 품질에 큰 해가 없음)
- [ ] **Step 3:** 결과를 `src/lib/claude/CLAUDE.md`에 한 줄 기록, 바꿨다면 커밋 `fix(chain): claude 실행 시 전역 설정 제외 (#5)`

---

### Task 4: 체인 바탕 + 기획안 단계 (TDD)

**Files:**
- Create: `src/lib/chain/types.ts`, `src/lib/chain/build-prompt.ts`, `src/lib/chain/steps/plan.ts`, `src/lib/chain/steps/plan.test.ts`, `src/lib/chain/registry.ts`, `src/lib/chain/index.ts`, `src/lib/chain/generate.ts`, `src/lib/chain/generate.test.ts`, `src/lib/prompts/context.ts`, `src/lib/prompts/chain/plan.ts`
- Modify: `package.json` (`zod@4.6.7` 의존성 명시), `src/lib/chain/CLAUDE.md`

**Consumes:** Task 1 storage 함수, Task 2 `runClaude` · `ChainError`
**Produces:**
- `ChainStep<T> = { key: DocKey; extra?: DocKey[]; schema: z.ZodType<T>; prompt: string; render: (out: T) => string }`
- `CHAIN: Partial<Record<DocKey, ChainStep<any>>>` (B-1은 plan만) · `GENERATABLE: DocKey[]`
- `generateDoc(id: string, key: DocKey): Promise<void>` — 실패는 `ChainError`

- [ ] **Step 1: `npm i zod@4.6.7`**

- [ ] **Step 2: 프롬프트 상수**

`src/lib/prompts/context.ts`
```ts
/** 모든 체인 단계 앞에 붙는 공통 규칙 */
export const CHAIN_RULES = `너는 한국 IT 회사의 시니어 PO다. 아래 입력만 근거로 문서를 쓴다.
- 입력에 없는 사실(수치 · 경쟁사 · 사용자 조사 결과)은 지어내지 말고 "[확인 필요: ○○]"로 남긴다.
- 개수 · 합계 · 순위 계산은 하지 않는다. 필요한 칸만 채운다.
- 문장은 짧은 한국어 평서문. 마크다운 문법은 쓰지 않는다 (형식은 코드가 만든다).`;

export const INPUT_HEADING = '## 입력';
```

`src/lib/prompts/chain/plan.ts`
```ts
/** 아이디어 → 상세 기획안. 출력 스키마: planSchema (src/lib/chain/steps/plan.ts) */
export const PLAN_PROMPT = `## 할 일
아이디어 메모를 상세 기획안으로 펼친다.
- summary: 한 줄 요약 (40자 안팎)
- problem: 누가 어떤 상황에서 무엇 때문에 불편한가
- targetUsers: 핵심 사용자 1~3그룹
- value: 이 서비스만의 핵심 가치
- features: 주요 기능 3~6개 (name · description)
- successMetrics: 성공을 판단할 지표 2~4개 (지표 이름과 이유, 목표 수치는 [확인 필요])
- risks: 가장 큰 위험 2~4개
- openQuestions: 기획을 이어 가기 전에 확인할 것`;
```

- [ ] **Step 3: 실패하는 테스트** `src/lib/chain/steps/plan.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { planStep } from './plan';

const ok = {
  summary: '동네 원데이 클래스 추천',
  problem: '퇴근 후 할 거리를 찾기 어렵다',
  targetUsers: ['직장인'],
  value: '가까운 곳에서 바로 예약',
  features: [{ name: '추천', description: '취향 기반 추천' }],
  successMetrics: ['예약 전환율 — [확인 필요: 목표치]'],
  risks: ['공급자 확보'],
  openQuestions: ['결제 수수료'],
};

describe('planStep', () => {
  it('정상 예시는 통과', () => {
    expect(planStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    const { problem: _omit, ...rest } = ok;
    expect(planStep.schema.safeParse(rest).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(planStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['summary']) });
  });
  it('render는 제목 칸을 모두 담은 md', () => {
    const md = planStep.render(ok);
    for (const h of ['## 한 줄 요약', '## 문제', '## 대상 사용자', '## 핵심 가치', '## 주요 기능', '## 성공 지표', '## 위험', '## 확인 필요']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('- **추천** — 취향 기반 추천');
  });
});
```

- [ ] **Step 4: 실패 확인** — `npx vitest run src/lib/chain` FAIL

- [ ] **Step 5: 구현**

`src/lib/chain/types.ts`
```ts
import type { z } from 'zod';

import type { DocKey } from '@/lib/storage';

/** 체인 단계 하나. 앞 단계(from)는 storage의 DOC_STEPS에 있다. */
export type ChainStep<T> = {
  key: DocKey;
  /** from 말고 함께 넣는 문서 (예: prd ← plan) */
  extra?: DocKey[];
  schema: z.ZodType<T>;
  /** src/lib/prompts/chain/<key>.ts 의 상수 */
  prompt: string;
  /** AI 출력(JSON) → md. 형식은 코드가 만든다 */
  render: (out: T) => string;
};
```

`src/lib/chain/steps/plan.ts`
```ts
import { z } from 'zod';

import { PLAN_PROMPT } from '@/lib/prompts/chain/plan';

import type { ChainStep } from '../types';

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n');

export const planSchema = z.object({
  summary: z.string().min(1),
  problem: z.string().min(1),
  targetUsers: z.array(z.string()).min(1),
  value: z.string().min(1),
  features: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })).min(1),
  successMetrics: z.array(z.string()).min(1),
  risks: z.array(z.string()),
  openQuestions: z.array(z.string()),
});

export type PlanOutput = z.infer<typeof planSchema>;

export const planStep: ChainStep<PlanOutput> = {
  key: 'plan',
  schema: planSchema,
  prompt: PLAN_PROMPT,
  render: (o) =>
    [
      `## 한 줄 요약\n${o.summary}`,
      `## 문제\n${o.problem}`,
      `## 대상 사용자\n${list(o.targetUsers)}`,
      `## 핵심 가치\n${o.value}`,
      `## 주요 기능\n${o.features.map((f) => `- **${f.name}** — ${f.description}`).join('\n')}`,
      `## 성공 지표\n${list(o.successMetrics)}`,
      `## 위험\n${list(o.risks) || '- 없음'}`,
      `## 확인 필요\n${list(o.openQuestions) || '- 없음'}`,
    ].join('\n\n'),
};
```

`src/lib/chain/registry.ts` (generate.ts와 index.ts 사이 순환 import를 피하려고 따로)
```ts
import type { DocKey } from '@/lib/storage';

import { planStep } from './steps/plan';
import type { ChainStep } from './types';

/** 단계 등록부. 순서는 storage DOC_STEPS. B-2에서 나머지 5개를 한 줄씩 추가 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHAIN: Partial<Record<DocKey, ChainStep<any>>> = {
  plan: planStep,
};

export const GENERATABLE = Object.keys(CHAIN) as DocKey[];
```

`src/lib/chain/index.ts` (밖에서 import하는 입구)
```ts
export { generateDoc } from './generate';
export { GENERATABLE } from './registry';
export { ChainError } from '@/lib/claude/run';
```

`src/lib/chain/build-prompt.ts`
```ts
import { CHAIN_RULES, INPUT_HEADING } from '@/lib/prompts/context';

/** 공통 규칙 + 단계 지시 + 입력 문서들. 문장은 prompts에만 있고 여기선 이어 붙이기만 */
export function buildPrompt(stepPrompt: string, inputs: { label: string; body: string }[]) {
  const blocks = inputs.map((i) => `### ${i.label}\n${i.body}`);
  return [CHAIN_RULES, stepPrompt, INPUT_HEADING, ...blocks].join('\n\n');
}
```

`src/lib/chain/generate.ts`
```ts
import 'server-only';

import { z } from 'zod';

import { ChainError, runClaude } from '@/lib/claude/run';
import {
  clearRunning, DOC_STEPS, getDocs, getIdea, hashOf, ideaSource, markRunning, saveDoc, type DocKey,
} from '@/lib/storage';

import { buildPrompt } from './build-prompt';
import { CHAIN } from './registry';

/** 앞 문서 읽기 → 프롬프트 → claude → 형식 검사 → md 저장 */
export async function generateDoc(id: string, key: DocKey) {
  const step = CHAIN[key];
  const meta = DOC_STEPS.find((s) => s.key === key);
  if (!step || !meta) throw new ChainError('아직 만들 수 없는 문서예요.');

  const idea = await getIdea(id);
  if (!idea) throw new ChainError('아이디어를 찾을 수 없어요.');
  const docs = await getDocs(id);
  const bodyOf = (k: DocKey) => docs.find((d) => d.key === k)?.content ?? null;

  const source = meta.from === 'idea' ? ideaSource(idea) : bodyOf(meta.from);
  if (!source) throw new ChainError('앞 문서를 먼저 만들어 주세요.');

  const labelOf = (k: DocKey | 'idea') => (k === 'idea' ? '아이디어' : DOC_STEPS.find((s) => s.key === k)!.label);
  const inputs = [
    { label: labelOf(meta.from), body: source },
    ...(step.extra ?? []).flatMap((k) => (bodyOf(k) ? [{ label: labelOf(k), body: bodyOf(k)! }] : [])),
  ];

  await markRunning(id, key);
  try {
    const raw = await runClaude({ prompt: buildPrompt(step.prompt, inputs), jsonSchema: z.toJSONSchema(step.schema) });
    const parsed = step.schema.safeParse(raw);
    if (!parsed.success) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    await saveDoc(id, key, step.render(parsed.data), { sourceHash: hashOf(source) });
  } finally {
    await clearRunning(id);
  }
}
```

- [ ] **Step 6: generate 테스트** `src/lib/chain/generate.test.ts` — 임시 데이터 폴더 + 가짜 claude가 정상 plan JSON을 내도록 `FAKE_CLAUDE=plan` 모드를 `fake-claude.mjs`에 추가 (`structured_output`에 Step 3의 `ok`와 같은 객체)
```ts
it('기획안을 만들어 plan.md로 저장하고 stale=false', async () => {
  process.env.FAKE_CLAUDE = 'plan';
  const idea = await createIdea({ title: '동네 클래스', memo: '' });
  await generateDoc(idea.id, 'plan');
  const plan = (await getDocs(idea.id))[0];
  expect(plan.content).toContain('## 한 줄 요약');
  expect(plan.stale).toBe(false);
  expect(await getRunning(idea.id)).toBeNull();
});
it('등록되지 않은 단계는 거부 (B-1엔 roadmap 없음)', async () => {
  const idea = await createIdea({ title: 'x', memo: '' });
  await expect(generateDoc(idea.id, 'roadmap')).rejects.toThrow('아직 만들 수 없는 문서');
});
it('형식이 틀리면 저장하지 않고 생성 중 표시도 지운다', async () => {
  process.env.FAKE_CLAUDE = 'ok'; // { echo, args } → planSchema 불일치
  const idea = await createIdea({ title: 'x', memo: '' });
  await expect(generateDoc(idea.id, 'plan')).rejects.toThrow('결과 형식이 맞지 않아요');
  expect((await getDocs(idea.id))[0].content).toBeNull();
  expect(await getRunning(idea.id)).toBeNull();
});
```

- [ ] **Step 7: 통과 확인** — `npm test` 전부 PASS · `npm run lint && npm run typecheck`
- [ ] **Step 8: chain CLAUDE.md** — 파일 지도(`types` · `steps/` · `build-prompt` · `generate` · `index`의 `CHAIN`), "커리큘럼 → 개발 로드맵 확정", "실제 호출은 `src/lib/claude/run.ts`"로 갱신. prompts CLAUDE.md는 `context.ts`가 상수(`CHAIN_RULES`)라는 점만 반영
- [ ] **Step 9: 커밋** `feat(chain): 체인 단계 형식과 기획안 단계 (#5)`

---

### Task 5: 상세 화면 — 만들기 · 보기 · 편집 · 다시 만들기

**Files:**
- Create: `src/app/ideas/[id]/doc-card.tsx`, `src/app/ideas/[id]/use-refresh-while.ts`
- Modify: `src/app/actions.ts`, `src/app/ideas/[id]/page.tsx`, `src/app/ideas/[id]/idea-detail.tsx`, `package.json`(`react-markdown@10.1.0`)

**Consumes:** `generateDoc`, `GENERATABLE`, `ChainError`, `getDocs`, `getRunning`, `updateDocBody`, `StorageError`
**Produces:** `generateDocAction(id, key, prev: DocActionState): Promise<DocActionState>` · `updateDocAction(id, key, prev, formData)` · `type DocActionState = { error?: string; savedAt?: number }`

- [ ] **Step 1: Next 문서 확인** — `node_modules/next/dist/docs/01-app/` 에서 Server Action(`useActionState` · 긴 작업) · `router.refresh` 항목을 읽고 아래 코드와 다른 점이 있으면 맞춘다
- [ ] **Step 2: `npm i react-markdown@10.1.0`**
- [ ] **Step 3: actions.ts에 추가**

```ts
import { ChainError, generateDoc } from '@/lib/chain';
import { updateDocBody, type DocKey } from '@/lib/storage';

export type DocActionState = { error?: string; savedAt?: number };

const chainMessage = (e: unknown) =>
  e instanceof ChainError || e instanceof StorageError ? e.message : '문서를 만들지 못했어요. 서버 로그를 확인해 주세요.';

export async function generateDocAction(id: string, key: DocKey, _prev: DocActionState): Promise<DocActionState> {
  try {
    await generateDoc(id, key);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] generateDoc', e);
    return { error: chainMessage(e) };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export async function updateDocAction(id: string, key: DocKey, _prev: DocActionState, formData: FormData): Promise<DocActionState> {
  try {
    await updateDocBody(id, key, String(formData.get('body') ?? ''));
  } catch (e) {
    return { error: toMessage(e) };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}
```
(`actions.ts`는 storage · chain만 호출. `src/app/CLAUDE.md` 규칙 "storage는 페이지 · actions에서만"에 chain도 추가)

- [ ] **Step 4: page.tsx** — `getRunning(id)`도 읽어 `running={running?.key ?? null}`, 액션은 `generateDocAction.bind(null, id)` · `updateDocAction.bind(null, id)` 로 넘긴다 (key는 카드에서 bind)

- [ ] **Step 5: `use-refresh-while.ts`**
```ts
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** on인 동안 ms마다 서버 데이터를 다시 받는다 (다른 탭 · 새로고침 뒤 생성 중 표시용) */
export function useRefreshWhile(on: boolean, ms = 3000) {
  const router = useRouter();
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [on, ms, router]);
}
```

- [ ] **Step 6: `doc-card.tsx`** (`'use client'`, Montage 컴포넌트는 `montage-ui` 스킬로 props 확인)
  - props: `doc: Doc` · `index: number` · `ready: boolean`(이 단계가 `GENERATABLE`에 있음 — 페이지가 계산해 넘김) · `hasSource: boolean`(앞 문서 또는 아이디어 있음) · `running: DocKey | null` · `generate: (key, prev) => Promise<DocActionState>` · `update: (key, prev, fd) => Promise<DocActionState>`
  - 상태별 표시 (spec §5 표):
    - 없음 + `ready` + `hasSource` → `<form action={genAction}><Button type="submit">{label} 만들기</Button></form>` · `useActionState(generate.bind(null, doc.key), {})`
    - 없음 + `!ready` (B-2 대상) → 비활성 "준비 중"
    - 없음 + `ready` + `!hasSource` → 비활성 "앞 문서 먼저"
    - `isPending || running === doc.key` → Loading(Montage) + "만드는 중이에요. 1~2분 걸려요." · `running !== null`이면 다른 카드 버튼 disabled
    - 있음 → `<ReactMarkdown>{doc.content}</ReactMarkdown>` (Typography body2 감싸기, 최대 높이 480px 스크롤) · "편집" 토글 → TextArea(name="body", 기본값 content, width="100%", 12줄) + "저장" / "취소" · "다시 만들기" → `window.confirm('지금 문서는 .history에 남기고 새로 만들까요?')`
    - `doc.stale` → ContentBadge(cautionary) "앞 문서가 바뀌었어요"
    - `state.error` → SectionMessage(negative) 한 줄
  - `useRefreshWhile(running !== null && !isPending)`
- [ ] **Step 7: idea-detail.tsx** — 문서 6칸 반복을 `DocCard`로 교체, `pre` 스타일 삭제
- [ ] **Step 8:** `npm run lint && npm run typecheck && npm test && npm run build`
- [ ] **Step 9: 커밋** `feat(chain): 상세 화면 문서 만들기 · 편집 · 다시 만들기 (#5)`

---

### Task 6: 실제 확인 · 문서 · 리뷰 · PR

- [ ] **Step 1:** `.env.local`에 `HATCH_DATA_DIR=<임시 폴더>` → `preview_start hatch-dev` → 아이디어 쓰기 → 상세 → "기획안 만들기" → 실제 `claude`로 생성(1~2분) → 마크다운 표시 확인
- [ ] **Step 2:** 생성 중 새로고침 → "만드는 중" 유지 · 끝나면 자동으로 문서 표시
- [ ] **Step 3:** 편집 → 저장 → `.history/`에 이전 판 · 아이디어 메모 수정 → "앞 문서가 바뀌었어요" · 다시 만들기 → 배지 사라짐
- [ ] **Step 4:** `HATCH_CLAUDE_BIN=/nope` 로 서버 재시작 → "claude를 찾을 수 없어요" 한 줄 · 콘솔 오류 없음
- [ ] **Step 5:** 모음 화면 진행 배지 "기획안" 확인 · `.env.local` · 임시 폴더 정리
- [ ] **Step 6:** 루트 CLAUDE.md "지금 단계"를 "A 완료 · B-1 진행"으로, 폴더 지도에 `src/lib/claude/` 한 줄 (60줄 이하)
- [ ] **Step 7:** `npm run lint && npm run typecheck && npm test && npm run build` 결과를 PR 본문에
- [ ] **Step 8:** `hatch-reviewer` → 지적 반영 → push → PR `feat(chain): B-1 체인 바탕 + 기획안 단계 (#5)` (closes #5, 라벨 area:chain · type:feat, 마일스톤 B) → **머지는 사용자 승인 후**
