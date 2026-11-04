# macOS 앱 E1: Next 준비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 맥 앱(E2부터)이 쓸 수 있게 Next 쪽을 준비한다. 앱이 번들에 넣을 standalone 서버, 앱 전용 주소 `/api/app/status`와 `/api/app/ideas`, 그 주소를 지키는 앱 비밀값, 생성이 끝난 것을 기억하는 작업 목록.

**Architecture:** 웹 버전과 Vercel 데모는 바뀌지 않는다. standalone은 `HATCH_STANDALONE=1`일 때만 켠다. 앱 전용 주소는 `HATCH_APP_TOKEN`이 없으면 404라 웹과 데모에서는 없는 주소와 같다. 생성 중과 끝난 작업은 서버 메모리(`globalThis`)에 두고, Server Action 세 곳(문서 생성, 확인 질문, 도구 실행)이 시작과 끝을 알린다.

**Tech Stack:** Next.js 16.4.3 App Router (Route Handlers), TypeScript, vitest, Node `crypto`.

spec: [docs/specs/2026-11-04-macos-app-design.md](../specs/2026-11-04-macos-app-design.md) §1, §1-1, §3-2, §6, §7 E1. 이슈는 Task 0에서 만든다.

## Global Constraints
- GitHub CI(Actions)는 쓰지 않는다. 검증은 로컬에서 `npm run lint && npm run typecheck && npm test && npm run build`
- 모든 글(코드 주석, 화면 문구, 커밋, PR, 문서)에 가운데점을 쓰지 않는다. 쉼표나 "와/과"로 나눈다
- 새 의존성 없음. 저장 형식(`~/Hatch` md 파일) 그대로
- 웹 버전(`npm run dev`, `npm start`)과 Vercel 데모(`HATCH_DEMO=1`) 동작이 바뀌면 안 된다
- 앱 비밀값, 발행 토큰은 로그와 응답에 쓰지 않는다
- Next 코드를 쓰기 전에 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`와 `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`를 읽는다
- 커밋 `<type>(infra): 내용 (#이슈)`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- PR은 15파일, 400줄 안쪽. 머지는 사용자 승인 뒤 squash

## spec과 달라지는 것 (Task 6에서 spec에도 반영)
| spec | plan | 이유 |
| --- | --- | --- |
| `output: 'standalone'`을 늘 켠다 | `HATCH_STANDALONE=1`일 때만 | Vercel 빌드를 아예 건드리지 않으니 데모를 다시 배포해 확인할 필요가 없다 |
| `running`은 storage의 `.running.json`에서 읽는다 | 문서, 질문, 도구 모두 서버 메모리 | 도구와 질문에는 파일 표시가 없고, 아이디어 폴더를 2초마다 훑지 않아도 된다. claude는 한 번에 하나라 목록은 늘 0~1개 |
| 실패 알림 "눌러서 이유 보기" | "PRD를 만들지 못했어요. <이유>" | 알림을 눌러 연 화면에는 오류가 남아 있지 않다. 이유를 알림에 바로 적는다 |
| 알림 문구를 Swift가 만든다 | 서버가 `title`, `body`를 만들어 준다 | 조사(을/를)와 문서 이름을 아는 쪽이 서버다. Swift는 받은 글을 그대로 띄운다 |

## 파일 지도
| 파일 | 할 일 |
| --- | --- |
| `next.config.ts` | `HATCH_STANDALONE=1`이면 `output: 'standalone'` |
| `src/lib/app/token.ts` | `appAuth(header)`: 앱 비밀값 확인, `deny(auth)`: 404, 401 응답 |
| `src/lib/app/jobs.ts` | 작업 목록(메모리), `startJob`, `jobsSnapshot`, 알림 문구 만들기(`docJob`, `questionsJob`, `toolJob`) |
| `src/lib/app/track.ts` | Server Action이 부르는 `trackDoc`, `trackQuestions`, `trackTool` (아이디어 제목 읽기) |
| `src/lib/app/quick-idea.ts` | 빠른 아이디어 글 한 덩어리를 제목과 메모로 나눈다 |
| `src/lib/app/CLAUDE.md` | 폴더 규칙 (30줄 이하) |
| `src/app/api/app/status/route.ts` | `GET` 상태 |
| `src/app/api/app/ideas/route.ts` | `POST` 빠른 아이디어 |
| `src/app/actions.ts` | 세 Server Action에 시작과 끝 알림 |
| 테스트 | `src/lib/app/token.test.ts`, `jobs.test.ts`, `quick-idea.test.ts`, `src/app/api/app/routes.test.ts` |
| `CLAUDE.md` | 폴더 지도에 `src/lib/app/` 한 줄 |

---

### Task 0: 이슈와 브랜치

- [ ] **Step 1: 이슈 만들기**

```bash
gh issue create --title "macOS 앱 E1: Next 준비 (standalone, 앱 전용 주소)" --label "area:infra" --label "type:feat" \
  --body "spec docs/specs/2026-11-04-macos-app-design.md §7 E1. plan docs/plans/2026-11-04-macos-e1-next.md. 웹 버전과 Vercel 데모는 바뀌지 않는다."
```
나온 번호를 아래에서 `<n>`으로 쓴다.

- [ ] **Step 2: main에서 브랜치**

```bash
git switch main && git pull --ff-only && git switch -c feat/<n>-macos-e1-next
```

---

### Task 1: standalone 빌드 옵션

**Files:**
- Modify: `next.config.ts` (맨 아래 `nextConfig` 객체)

**Interfaces:**
- Produces: `HATCH_STANDALONE=1 npm run build` → `.next/standalone/server.js`. E2의 `macos/scripts/build.sh`가 이 명령을 쓴다

- [ ] **Step 1: 설정 더하기**

`nextConfig` 객체의 `serveHost` 펼치기 바로 위에 넣는다.

```ts
  // 맥 앱 번들용 (spec 2026-11-04-macos-app §1). macos/scripts/build.sh만 켠다. 웹, Vercel 빌드는 그대로
  ...(process.env.HATCH_STANDALONE === '1' && {
    output: 'standalone' as const,
    outputFileTracingRoot: process.cwd(), // 상위 폴더 lockfile을 뿌리로 잡아 server.js가 깊이 숨지 않게
  }),
```

- [ ] **Step 2: 보통 빌드가 그대로인지**

Run: `npm run build && test ! -d .next/standalone && echo NO_STANDALONE`
Expected: 빌드 성공, `NO_STANDALONE`

- [ ] **Step 3: standalone 빌드**

Run: `HATCH_STANDALONE=1 npm run build && ls .next/standalone/server.js`
Expected: `.next/standalone/server.js`가 보인다

- [ ] **Step 4: 커밋**

```bash
git add next.config.ts
git commit -m "feat(infra): 맥 앱용 standalone 빌드 옵션 (#<n>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 앱 비밀값 확인

**Files:**
- Create: `src/lib/app/token.ts`
- Test: `src/lib/app/token.test.ts`

**Interfaces:**
- Produces: `APP_TOKEN_HEADER = 'x-hatch-app-token'`, `APP_TOKEN_MIN = 32`, `appAuth(given: string | null): 'ok' | 'off' | 'denied'`, `deny(auth: 'off' | 'denied'): Response`, `NO_STORE: { 'Cache-Control': 'no-store' }`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appAuth, deny } from './token';

const TOKEN = 'a'.repeat(64);
afterEach(() => vi.unstubAllEnvs());

describe('appAuth', () => {
  it('비밀값이 없거나 32자보다 짧으면 꺼짐 (웹 버전과 데모)', () => {
    vi.stubEnv('HATCH_APP_TOKEN', '');
    expect(appAuth(TOKEN)).toBe('off');
    vi.stubEnv('HATCH_APP_TOKEN', 'short');
    expect(appAuth('short')).toBe('off');
  });
  it('데모에서는 비밀값이 있어도 꺼짐', () => {
    vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
    vi.stubEnv('HATCH_DEMO', '1');
    expect(appAuth(TOKEN)).toBe('off');
  });
  it('같으면 ok, 다르거나 없으면 denied', () => {
    vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
    expect(appAuth(TOKEN)).toBe('ok');
    expect(appAuth('b'.repeat(64))).toBe('denied');
    expect(appAuth(TOKEN.slice(1))).toBe('denied');
    expect(appAuth(null)).toBe('denied');
  });
  it('꺼짐은 404, 거절은 401, 둘 다 캐시하지 않는다', () => {
    expect(deny('off').status).toBe(404);
    expect(deny('denied').status).toBe(401);
    expect(deny('denied').headers.get('cache-control')).toBe('no-store');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/app/token.test.ts`
Expected: FAIL, `Cannot find module './token'`

- [ ] **Step 3: 구현**

```ts
import 'server-only';

import { timingSafeEqual } from 'node:crypto';

import { isDemo } from '@/lib/demo';

// 맥 앱이 켤 때마다 만드는 비밀값 (spec 2026-11-04-macos-app §1-1). 같은 맥의 다른 프로그램이 앱 전용 주소를 못 쓰게
export const APP_TOKEN_HEADER = 'x-hatch-app-token';
export const APP_TOKEN_MIN = 32;
export const NO_STORE = { 'Cache-Control': 'no-store' };

export function appAuth(given: string | null): 'ok' | 'off' | 'denied' {
  const want = process.env.HATCH_APP_TOKEN?.trim() ?? '';
  if (isDemo() || want.length < APP_TOKEN_MIN) return 'off';
  const a = Buffer.from(given ?? '');
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'denied';
}

/** 꺼짐은 없는 주소처럼 404, 비밀값이 틀리면 401 */
export function deny(auth: 'off' | 'denied') {
  return Response.json({ ok: false }, { status: auth === 'off' ? 404 : 401, headers: NO_STORE });
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/app/token.test.ts`
Expected: PASS 4개

- [ ] **Step 5: 커밋**

```bash
git add src/lib/app/token.ts src/lib/app/token.test.ts
git commit -m "feat(infra): 앱 전용 주소 비밀값 확인 (#<n>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 작업 목록과 알림 문구

**Files:**
- Create: `src/lib/app/jobs.ts`
- Test: `src/lib/app/jobs.test.ts`

**Interfaces:**
- Produces:
  - `type JobInfo = { ideaId: string | null; title: string; doing: string; doneText: string; failText: string; path: string }`
  - `type RunningJob = { id: string; ideaId: string | null; title: string; doing: string; startedAt: string }`
  - `type FinishedJob = { id: string; ideaId: string | null; title: string; body: string; ok: boolean; path: string; at: string }`
  - `type JobEnd = { ok: true; path?: string } | { ok: false; message: string }`
  - `startJob(info: JobInfo): (end: JobEnd) => void` (두 번 불러도 한 번만 남긴다)
  - `jobsSnapshot(): { running: RunningJob[]; finished: FinishedJob[] }` (finished는 새것부터, 최대 `FINISHED_MAX = 20`)
  - `docJob(ideaId: string, ideaTitle: string, docLabel: string): JobInfo`
  - `questionsJob(ideaId: string, ideaTitle: string): JobInfo`
  - `toolJob(toolKey: string, toolLabel: string, ideaId: string | null, ideaTitle: string | null): JobInfo`
  - `toolResultPath(toolKey: string, ideaId: string | null, resultId: string): string`
  - `resetJobsForTest(): void`

- [ ] **Step 1: 실패하는 테스트**

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import { docJob, FINISHED_MAX, jobsSnapshot, questionsJob, resetJobsForTest, startJob, toolJob, toolResultPath } from './jobs';

beforeEach(() => resetJobsForTest());

describe('작업 목록', () => {
  it('시작하면 running, 끝나면 finished로 옮긴다', () => {
    const done = startJob(docJob('i1', 'PT 예약 앱', 'PRD'));
    expect(jobsSnapshot().running).toMatchObject([{ ideaId: 'i1', title: 'PT 예약 앱', doing: 'PRD 만드는 중' }]);
    done({ ok: true });
    const { running, finished } = jobsSnapshot();
    expect(running).toEqual([]);
    expect(finished).toMatchObject([{ ideaId: 'i1', title: 'PT 예약 앱', body: 'PRD를 만들었어요', ok: true, path: '/ideas/i1' }]);
    expect(finished[0].id).toBeTruthy();
  });

  it('실패하면 이유를 알림 본문에 붙인다', () => {
    startJob(docJob('i1', 'PT 예약 앱', '기획안'))({ ok: false, message: '5분 안에 끝나지 않았어요. 다시 만들어 주세요.' });
    expect(jobsSnapshot().finished[0]).toMatchObject({ ok: false, body: '기획안을 만들지 못했어요. 5분 안에 끝나지 않았어요. 다시 만들어 주세요.' });
  });

  it('끝을 두 번 알려도 한 번만 남긴다', () => {
    const done = startJob(questionsJob('i1', '앱'));
    done({ ok: true });
    done({ ok: false, message: 'x' });
    expect(jobsSnapshot().finished).toHaveLength(1);
  });

  it(`finished는 새것부터 ${FINISHED_MAX}개까지`, () => {
    for (let i = 0; i < FINISHED_MAX + 3; i++) startJob(docJob(`i${i}`, `앱${i}`, 'PRD'))({ ok: true });
    const { finished } = jobsSnapshot();
    expect(finished).toHaveLength(FINISHED_MAX);
    expect(finished[0].ideaId).toBe(`i${FINISHED_MAX + 2}`);
  });

  it('도구는 끝날 때 결과 주소로 바꿀 수 있다', () => {
    const done = startJob(toolJob('voc', 'VOC 우선순위', null, null));
    expect(jobsSnapshot().running[0]).toMatchObject({ title: 'VOC 우선순위', doing: 'VOC 우선순위 실행 중' });
    done({ ok: true, path: toolResultPath('voc', null, 'r1') });
    expect(jobsSnapshot().finished[0]).toMatchObject({ body: 'VOC 우선순위 결과가 나왔어요', path: '/tools/voc?result=r1' });
  });
});

describe('알림 문구', () => {
  it('받침에 맞춰 을/를', () => {
    expect(docJob('i', 't', '개발 로드맵').doneText).toBe('개발 로드맵을 만들었어요');
    expect(docJob('i', 't', '기능명세').doneText).toBe('기능명세를 만들었어요');
    expect(docJob('i', 't', 'PRD').doneText).toBe('PRD를 만들었어요');
    expect(toolJob('negotiation', '이해관계자 협상', null, null).failText).toBe('이해관계자 협상을 실행하지 못했어요.');
  });
  it('확인 질문은 아이디어 상세로', () => {
    expect(questionsJob('i9', '앱')).toMatchObject({ doing: '확인 질문 만드는 중', doneText: '확인 질문을 만들었어요', path: '/ideas/i9' });
  });
  it('아이디어 문서로 돌린 도구는 아이디어 제목이 알림 제목, 주소에 idea가 붙는다', () => {
    expect(toolJob('prd-review', 'PRD 리뷰 위원회', 'i2', 'PT 예약 앱')).toMatchObject({ title: 'PT 예약 앱', path: '/tools/prd-review?idea=i2' });
    expect(toolResultPath('prd-review', 'i2', 'r5')).toBe('/tools/prd-review?idea=i2&result=r5');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/app/jobs.test.ts`
Expected: FAIL, `Cannot find module './jobs'`

- [ ] **Step 3: 구현**

```ts
import 'server-only';

import { randomUUID } from 'node:crypto';

// 맥 앱 알림용 작업 목록 (spec 2026-11-04-macos-app §3-2). 서버 메모리라 서버를 다시 켜면 빈다.
// globalThis에 두는 건 Server Action과 Route Handler가 모듈을 따로 읽어도 같은 목록을 보게 하려고
export const FINISHED_MAX = 20;

export type JobInfo = { ideaId: string | null; title: string; doing: string; doneText: string; failText: string; path: string };
export type RunningJob = { id: string; ideaId: string | null; title: string; doing: string; startedAt: string };
export type FinishedJob = { id: string; ideaId: string | null; title: string; body: string; ok: boolean; path: string; at: string };
export type JobEnd = { ok: true; path?: string } | { ok: false; message: string };

type Store = { running: Map<string, RunningJob>; finished: FinishedJob[] };
type WithStore = typeof globalThis & { __hatchJobs?: Store };

const store = (): Store => ((globalThis as WithStore).__hatchJobs ??= { running: new Map(), finished: [] });

export function startJob(info: JobInfo): (end: JobEnd) => void {
  const id = randomUUID();
  const s = store();
  s.running.set(id, { id, ideaId: info.ideaId, title: info.title, doing: info.doing, startedAt: new Date().toISOString() });
  let ended = false;
  return (end) => {
    if (ended) return;
    ended = true;
    s.running.delete(id);
    s.finished.unshift({
      id,
      ideaId: info.ideaId,
      title: info.title,
      body: end.ok ? info.doneText : `${info.failText} ${end.message}`,
      ok: end.ok,
      path: (end.ok && end.path) || info.path,
      at: new Date().toISOString(),
    });
    s.finished.length = Math.min(s.finished.length, FINISHED_MAX);
  };
}

export const jobsSnapshot = () => ({ running: [...store().running.values()], finished: [...store().finished] });

export const resetJobsForTest = () => {
  delete (globalThis as WithStore).__hatchJobs;
};

/** 받침이 있으면 '을', 없으면(영문 이름 포함) '를' */
const eulReul = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '을' : '를';
};

const made = (label: string, ideaId: string, ideaTitle: string): JobInfo => ({
  ideaId,
  title: ideaTitle,
  doing: `${label} 만드는 중`,
  doneText: `${label}${eulReul(label)} 만들었어요`,
  failText: `${label}${eulReul(label)} 만들지 못했어요.`,
  path: `/ideas/${ideaId}`,
});

export const docJob = (ideaId: string, ideaTitle: string, docLabel: string) => made(docLabel, ideaId, ideaTitle);
export const questionsJob = (ideaId: string, ideaTitle: string) => made('확인 질문', ideaId, ideaTitle);

const toolPath = (toolKey: string, ideaId: string | null, resultId?: string) => {
  const q = new URLSearchParams();
  if (ideaId) q.set('idea', ideaId);
  if (resultId) q.set('result', resultId);
  const s = q.toString();
  return `/tools/${toolKey}${s ? `?${s}` : ''}`;
};

export const toolResultPath = (toolKey: string, ideaId: string | null, resultId: string) => toolPath(toolKey, ideaId, resultId);

export const toolJob = (toolKey: string, toolLabel: string, ideaId: string | null, ideaTitle: string | null): JobInfo => ({
  ideaId,
  title: ideaTitle ?? toolLabel,
  doing: `${toolLabel} 실행 중`,
  doneText: `${toolLabel} 결과가 나왔어요`,
  failText: `${toolLabel}${eulReul(toolLabel)} 실행하지 못했어요.`,
  path: toolPath(toolKey, ideaId),
});
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/app/jobs.test.ts`
Expected: PASS 8개

- [ ] **Step 5: 커밋**

```bash
git add src/lib/app/jobs.ts src/lib/app/jobs.test.ts
git commit -m "feat(infra): 맥 앱 알림용 작업 목록 (#<n>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Server Action 세 곳에서 시작과 끝 알리기

**Files:**
- Create: `src/lib/app/track.ts`
- Modify: `src/app/actions.ts` (`generateDocAction` 172줄 근처, `makeQuestionsAction` 187줄 근처, `runToolAction` 248줄 근처)

**Interfaces:**
- Consumes: Task 3의 `startJob`, `docJob`, `questionsJob`, `toolJob`, `toolResultPath`, `JobEnd`
- Produces: `trackDoc(id: string, key: DocKey): Promise<((end: JobEnd) => void) | null>`, `trackQuestions(id: string)`, `trackTool(tool: { key: string; label: string }, source: ToolSource)` (모두 같은 반환형). claude가 이미 바쁘면 `null` (거절된 요청은 알리지 않는다)

- [ ] **Step 1: track.ts**

```ts
import 'server-only';

import { isClaudeBusy } from '@/lib/claude/run';
import { DOC_STEPS, getIdea, isValidId, type DocKey } from '@/lib/storage';
import type { ToolSource } from '@/lib/tools/types';

import { docJob, questionsJob, startJob, toolJob } from './jobs';

// claude가 바쁘면 이번 요청은 BUSY로 거절된다. 거절은 작업이 아니라 알리지 않는다
const ideaOf = async (id: string) => (isValidId(id) ? getIdea(id).catch(() => null) : null);

export async function trackDoc(id: string, key: DocKey) {
  if (isClaudeBusy()) return null;
  const idea = await ideaOf(id);
  const label = DOC_STEPS.find((s) => s.key === key)?.label;
  return idea && label ? startJob(docJob(idea.id, idea.title, label)) : null;
}

export async function trackQuestions(id: string) {
  if (isClaudeBusy()) return null;
  const idea = await ideaOf(id);
  return idea ? startJob(questionsJob(idea.id, idea.title)) : null;
}

export async function trackTool(tool: { key: string; label: string }, source: ToolSource) {
  if (isClaudeBusy()) return null;
  const idea = 'ideaId' in source ? await ideaOf(source.ideaId) : null;
  return startJob(toolJob(tool.key, tool.label, idea?.id ?? null, idea?.title ?? null));
}
```
`ToolSource`가 `@/lib/tools/types`에 없으면 `grep -rn "export type ToolSource" src/lib/tools`로 찾은 경로에서 가져온다.

- [ ] **Step 2: generateDocAction**

```ts
export async function generateDocAction(id: string, key: DocKey): Promise<DocActionState> {
  if (isDemo()) return { error: DEMO_MESSAGE };
  const done = await trackDoc(id, key);
  try {
    await generateDoc(id, key);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] generateDoc', e);
    const error = chainMessage(e);
    done?.({ ok: false, message: error });
    return { error };
  }
  done?.({ ok: true });
  revalidateIdeas();
  return { savedAt: Date.now() };
}
```

- [ ] **Step 3: makeQuestionsAction**

```ts
export async function makeQuestionsAction(id: string): Promise<QuestionsState> {
  if (isDemo()) return { error: DEMO_MESSAGE };
  const done = await trackQuestions(id);
  try {
    await makeQuestions(id);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] makeQuestions', e);
    const error = e instanceof ChainError || e instanceof StorageError ? e.message : '질문을 만들지 못했어요. 서버 로그를 확인해 주세요.';
    done?.({ ok: false, message: error });
    return { error };
  }
  done?.({ ok: true });
  revalidateIdeas();
  return { savedAt: Date.now() };
}
```

- [ ] **Step 4: runToolAction의 try 부분**

`const input` 모으기가 끝난 뒤, 기존 `try`를 이렇게 바꾼다.

```ts
  const done = await trackTool(tool, source);
  try {
    const { resultId, ideaId } = await runTool(tool, { source, input, prevId: get('prevId') || null });
    done?.({ ok: true, path: toolResultPath(key, ideaId, resultId) });
    revalidatePath(`/tools/${key}`);
    return { resultId, ideaId };
  } catch (e) {
    if (!(e instanceof ToolError)) console.error('[hatch] runTool', e);
    const error = e instanceof ToolError || e instanceof StorageError ? e.message : '도구를 실행하지 못했어요. 서버 로그를 확인해 주세요.';
    done?.({ ok: false, message: error });
    return { error };
  }
```
import 두 줄을 더한다: `import { toolResultPath } from '@/lib/app/jobs';`, `import { trackDoc, trackQuestions, trackTool } from '@/lib/app/track';`

- [ ] **Step 5: 기존 테스트와 타입**

Run: `npm run typecheck && npm test`
Expected: 오류 없음, 기존 테스트 모두 통과 (Server Action 동작은 그대로라 깨질 테스트가 없다)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/app/track.ts src/app/actions.ts
git commit -m "feat(infra): 문서, 질문, 도구 실행의 시작과 끝을 작업 목록에 (#<n>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 앱 전용 주소 두 개

**Files:**
- Create: `src/lib/app/quick-idea.ts`, `src/lib/app/quick-idea.test.ts`
- Create: `src/app/api/app/status/route.ts`, `src/app/api/app/ideas/route.ts`
- Test: `src/app/api/app/routes.test.ts`

**Interfaces:**
- Consumes: Task 2 `appAuth`, `deny`, `APP_TOKEN_HEADER`, `NO_STORE`. Task 3 `jobsSnapshot`, `resetJobsForTest`, `startJob`, `docJob`
- Produces (E3~E5의 Swift가 읽는 모양):
  - `GET /api/app/status` → `{ ok: true, claudeBusy: boolean, running: RunningJob[], finished: FinishedJob[] }`
  - `POST /api/app/ideas` 본문 `{ text: string }` → `{ ok: true, id, path }` 또는 400 `{ ok: false, error }`
  - `splitQuick(text: unknown): { title: string; memo: string } | { error: string }`, `QUICK_MAX = 2000`

- [ ] **Step 1: 빠른 아이디어 나누기, 실패하는 테스트**

```ts
import { describe, expect, it } from 'vitest';

import { QUICK_MAX, splitQuick } from './quick-idea';

describe('splitQuick', () => {
  it('첫 줄은 제목, 나머지는 메모', () => {
    expect(splitQuick('  PT 예약 앱\n트레이너가 빈 시간을 올린다\n\n회원이 고른다 ')).toEqual({
      title: 'PT 예약 앱',
      memo: '트레이너가 빈 시간을 올린다\n\n회원이 고른다',
    });
    expect(splitQuick('한 줄만')).toEqual({ title: '한 줄만', memo: '' });
  });
  it('빈 글, 글이 아닌 값, 너무 긴 글은 거절', () => {
    expect(splitQuick('   ')).toEqual({ error: '아이디어를 적어 주세요.' });
    expect(splitQuick(42)).toEqual({ error: '아이디어를 적어 주세요.' });
    expect(splitQuick('a'.repeat(QUICK_MAX + 1))).toEqual({ error: '2,000자까지 적을 수 있어요.' });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/app/quick-idea.test.ts`
Expected: FAIL, `Cannot find module './quick-idea'`

- [ ] **Step 3: 구현**

```ts
// 메뉴 막대 빠른 아이디어 (spec 2026-11-04-macos-app §3-4). 첫 줄이 제목, 나머지가 메모
export const QUICK_MAX = 2000;

export function splitQuick(text: unknown): { title: string; memo: string } | { error: string } {
  if (typeof text !== 'string' || !text.trim()) return { error: '아이디어를 적어 주세요.' };
  if (text.length > QUICK_MAX) return { error: '2,000자까지 적을 수 있어요.' };
  const [first, ...rest] = text.trim().split(/\r?\n/);
  return { title: first.trim(), memo: rest.join('\n').trim() };
}
```

Run: `npx vitest run src/lib/app/quick-idea.test.ts`
Expected: PASS 2개

- [ ] **Step 4: 주소 테스트 (실패)**

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { docJob, resetJobsForTest, startJob } from '@/lib/app/jobs';
import { listIdeas } from '@/lib/storage';

import { POST } from './ideas/route';
import { GET } from './status/route';

const TOKEN = 'k'.repeat(64);
const req = (url: string, init: RequestInit & { token?: string } = {}) =>
  new Request(`http://127.0.0.1${url}`, { ...init, headers: { ...(init.token ? { 'x-hatch-app-token': init.token } : {}), 'content-type': 'application/json' } });
let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-app-'));
  vi.stubEnv('HATCH_DATA_DIR', dir);
  vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
  resetJobsForTest();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(dir, { recursive: true, force: true });
});

describe('GET /api/app/status', () => {
  it('비밀값이 없으면 404, 틀리면 401', async () => {
    vi.stubEnv('HATCH_APP_TOKEN', '');
    expect((await GET(req('/api/app/status', { token: TOKEN }))).status).toBe(404);
    vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
    expect((await GET(req('/api/app/status', { token: 'x'.repeat(64) }))).status).toBe(401);
    expect((await GET(req('/api/app/status'))).status).toBe(401);
  });
  it('맞으면 작업 목록을 돌려준다', async () => {
    startJob(docJob('i1', 'PT 예약 앱', 'PRD'))({ ok: true });
    const res = await GET(req('/api/app/status', { token: TOKEN }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, claudeBusy: false, running: [], finished: [{ title: 'PT 예약 앱', body: 'PRD를 만들었어요' }] });
  });
});

describe('POST /api/app/ideas', () => {
  it('비밀값이 틀리면 저장하지 않는다', async () => {
    const res = await POST(req('/api/app/ideas', { method: 'POST', token: 'x'.repeat(64), body: JSON.stringify({ text: '앱' }) }));
    expect(res.status).toBe(401);
    expect((await listIdeas()).ideas).toHaveLength(0);
  });
  it('첫 줄을 제목으로 저장하고 주소를 돌려준다', async () => {
    const res = await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: JSON.stringify({ text: 'PT 예약 앱\n빈 시간 올리기' }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const [idea] = (await listIdeas()).ideas;
    expect(idea).toMatchObject({ title: 'PT 예약 앱', memo: '빈 시간 올리기' });
    expect(body).toEqual({ ok: true, id: idea.id, path: `/ideas/${idea.id}` });
  });
  it('빈 글, 깨진 JSON, 너무 큰 본문은 400 또는 413', async () => {
    expect((await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: JSON.stringify({ text: ' ' }) }))).status).toBe(400);
    expect((await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: '{' }))).status).toBe(400);
    expect((await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: JSON.stringify({ text: 'a'.repeat(20_000) }) }))).status).toBe(413);
  });
});
```

Run: `npx vitest run src/app/api/app/routes.test.ts`
Expected: FAIL, `Cannot find module './ideas/route'`

- [ ] **Step 5: status 주소**

`src/app/api/app/status/route.ts`

```ts
import { APP_TOKEN_HEADER, appAuth, deny, NO_STORE } from '@/lib/app/token';
import { jobsSnapshot } from '@/lib/app/jobs';
import { isClaudeBusy } from '@/lib/claude/run';

// 맥 앱이 알림, 메뉴 막대 상태를 위해 묻는 주소 (spec 2026-11-04-macos-app §3-2). request.headers를 읽어 늘 동적
export async function GET(request: Request) {
  const auth = appAuth(request.headers.get(APP_TOKEN_HEADER));
  if (auth !== 'ok') return deny(auth);
  return Response.json({ ok: true, claudeBusy: isClaudeBusy(), ...jobsSnapshot() }, { headers: NO_STORE });
}
```

- [ ] **Step 6: ideas 주소**

`src/app/api/app/ideas/route.ts`

```ts
import { revalidatePath } from 'next/cache';

import { splitQuick } from '@/lib/app/quick-idea';
import { APP_TOKEN_HEADER, appAuth, deny, NO_STORE } from '@/lib/app/token';
import { createIdea, StorageError } from '@/lib/storage';

const BODY_MAX = 16_000; // 2,000자 한글은 UTF-8로 6KB쯤. 넉넉히 두고 그보다 크면 읽지 않는다

// 메뉴 막대 빠른 아이디어 저장 (spec 2026-11-04-macos-app §3-4)
export async function POST(request: Request) {
  const auth = appAuth(request.headers.get(APP_TOKEN_HEADER));
  if (auth !== 'ok') return deny(auth);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > BODY_MAX) return Response.json({ ok: false, error: '너무 길어요.' }, { status: 413, headers: NO_STORE });
  let text: unknown;
  try {
    text = (JSON.parse(raw) as { text?: unknown })?.text;
  } catch {
    return Response.json({ ok: false, error: '형식이 맞지 않아요.' }, { status: 400, headers: NO_STORE });
  }
  const parsed = splitQuick(text);
  if ('error' in parsed) return Response.json({ ok: false, error: parsed.error }, { status: 400, headers: NO_STORE });
  try {
    const idea = await createIdea(parsed);
    revalidatePath('/');
    revalidatePath('/ideas', 'layout');
    return Response.json({ ok: true, id: idea.id, path: `/ideas/${idea.id}` }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof StorageError) return Response.json({ ok: false, error: e.message }, { status: 400, headers: NO_STORE });
    console.error('[hatch] app ideas', e);
    return Response.json({ ok: false, error: '저장하지 못했어요. 데이터 폴더를 확인해 주세요.' }, { status: 500, headers: NO_STORE });
  }
}
```
`content-length` 대신 실제 바이트를 센다. 본문 크기를 속인 요청도 막으려고.

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run src/app/api/app/routes.test.ts src/lib/app`
Expected: PASS 전부

- [ ] **Step 8: 커밋**

```bash
git add src/lib/app/quick-idea.ts src/lib/app/quick-idea.test.ts src/app/api/app
git commit -m "feat(infra): 앱 전용 주소 /api/app/status, /api/app/ideas (#<n>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: standalone 서버로 실제 확인, 폴더 문서, spec 맞추기

**Files:**
- Create: `src/lib/app/CLAUDE.md`
- Modify: `CLAUDE.md` (폴더 지도 표), `docs/specs/2026-11-04-macos-app-design.md` (§1, §3-2, §3-3)

- [ ] **Step 1: standalone 서버를 띄워 주소 확인**

앱이 E2에서 하는 일을 손으로 한 번 한다. 포트 3178 (3123은 다른 프로젝트가 쓴다).

```bash
HATCH_STANDALONE=1 npm run build
cp -R public .next/standalone/ && cp -R .next/static .next/standalone/.next/
D=$(mktemp -d) && T=$(openssl rand -hex 32)
HOSTNAME=127.0.0.1 PORT=3178 HATCH_DATA_DIR=$D HATCH_APP_TOKEN=$T node .next/standalone/server.js > "$D/server.log" 2>&1 &
echo $! > "$D/pid"; sleep 3
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3178/api/app/status
curl -s -H "x-hatch-app-token: $T" http://127.0.0.1:3178/api/app/status
curl -s -X POST -H "x-hatch-app-token: $T" -H 'content-type: application/json' -d '{"text":"확인용 아이디어"}' http://127.0.0.1:3178/api/app/ideas
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3178/
```
Expected: `401`, `{"ok":true,"claudeBusy":false,"running":[],"finished":[]}`, `{"ok":true,"id":"...","path":"/ideas/..."}`, `200`

- [ ] **Step 2: 화면에서 빠른 아이디어가 보이는지**

브라우저로 `http://127.0.0.1:3178/`를 열어 "확인용 아이디어"가 모음에 있는지, 콘솔 오류가 없는지 본다.

- [ ] **Step 3: 가짜 claude로 알림 목록 확인**

같은 서버를 `HATCH_CLAUDE_BIN=$PWD/src/lib/claude/fake-claude.mjs FAKE_CLAUDE=plan`을 더해 다시 띄우고, 화면에서 "확인용 아이디어"의 기획안을 만든 뒤 `status`를 다시 본다.
Expected: `finished[0]`이 `{"title":"확인용 아이디어","body":"기획안을 만들었어요","ok":true,"path":"/ideas/..."}`

- [ ] **Step 4: 내가 띄운 서버만 끄고 임시 폴더 지우기**

```bash
kill "$(cat "$D/pid")" && rm -rf "$D" .next/standalone
```
`$D`는 이 Task에서 만든 임시 폴더라 지워도 된다. 다른 포트의 프로세스는 건드리지 않는다.

- [ ] **Step 5: `src/lib/app/CLAUDE.md`**

```markdown
# src/lib/app/ — 맥 앱 전용

맥 앱(`macos/`)이 번들 안의 Next 서버와 이야기하는 곳. spec: `docs/specs/2026-11-04-macos-app-design.md`

- `token.ts`: `HATCH_APP_TOKEN`이 없거나 데모면 꺼짐(404). 머리 `x-hatch-app-token`이 다르면 401. 비교는 `timingSafeEqual`
- `jobs.ts`: 생성 중과 끝난 작업(최근 20개). 서버 메모리라 다시 켜면 빈다. 알림 제목과 본문은 여기서 만든다
- `track.ts`: Server Action이 시작에 부르고 끝에 결과를 넘긴다. claude가 바쁘면 알리지 않는다
- `quick-idea.ts`: 메뉴 막대 빠른 아이디어. 첫 줄 제목, 나머지 메모, 2,000자까지

## 규칙
- 앱 전용 주소는 `src/app/api/app/*`에만. 모든 주소가 맨 먼저 `appAuth`를 부른다
- 응답과 로그에 비밀값, 프롬프트, 문서 본문을 쓰지 않는다
- 응답 모양을 바꾸면 Swift 쪽(`macos/`) 디코더와 같은 PR에서 바꾼다
- 작업 목록을 파일로 옮기는 신호: 서버를 다시 켠 뒤 놓친 알림이 문제라는 말이 나오면
```

- [ ] **Step 6: 루트 `CLAUDE.md` 폴더 지도**

`src/lib/share/` 줄 아래에 한 줄 더한다. 이 파일을 고치므로 파일 안의 가운데점도 쉼표로 바꾼다 (메모리 규칙).

```markdown
| `src/lib/app/` | 맥 앱 전용: 앱 비밀값, 작업 목록, 빠른 아이디어 (`src/app/api/app/*`) | E | `ui-builder` |
```

Run: `perl -CSD -pi -e 's/\s*\x{00B7}\s*/, /g' CLAUDE.md && perl -CSD -ne '$n++ while /\x{00B7}/g; END { print $n+0, "\n" }' CLAUDE.md && wc -l CLAUDE.md`
Expected: `0`, 60줄 이하

- [ ] **Step 7: spec 맞추기**

`docs/specs/2026-11-04-macos-app-design.md`에서 위 "spec과 달라지는 것" 표의 네 줄을 반영한다.
- §1 "Next 쪽 변경" 줄: `HATCH_STANDALONE=1`일 때만 `output: 'standalone'`. 웹과 Vercel 빌드는 설정이 그대로
- §3-2 `status` 모양: `running: [{ id, ideaId, title, doing, startedAt }]`, `finished: [{ id, ideaId, title, body, ok, path, at }]`, 둘 다 서버 메모리
- §3-3 실패 알림: "PRD를 만들지 못했어요. <이유>"
- §3-2 `POST /api/app/ideas`: 첫 줄 제목, 나머지 메모, 2,000자, 본문 16KB 넘으면 413

Run: `perl -CSD -ne '$n++ while /\x{00B7}/g; END { print $n+0, "\n" }' docs/specs/2026-11-04-macos-app-design.md src/lib/app/CLAUDE.md`
Expected: `0`

- [ ] **Step 8: 커밋**

```bash
git add src/lib/app/CLAUDE.md CLAUDE.md docs/specs/2026-11-04-macos-app-design.md
git commit -m "docs(infra): 맥 앱 전용 폴더 규칙, spec을 E1 구현에 맞춤 (#<n>)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 검증, 리뷰, PR

- [ ] **Step 1: 전체 검증**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 통과. 테스트 수가 기존 430개보다 늘어난다

- [ ] **Step 2: 웹 버전 확인**

`HATCH_DATA_DIR`를 임시 폴더로 두고 `npm run dev -- -p 3177`. 아이디어를 하나 쓰고 기획안을 가짜 claude로 만든 뒤 화면이 전과 같은지, 콘솔 오류가 없는지 본다. `curl -s -o /dev/null -w '%{http_code}' http://localhost:3177/api/app/status`가 `404`인지 본다 (웹 버전에는 앱 비밀값이 없다). 확인 뒤 3177 서버만 끈다.

- [ ] **Step 3: hatch-reviewer**

`hatch-reviewer` 에이전트에 이 브랜치의 변경을 맡긴다. 지적을 고치고, 남긴 것은 PR에 이유를 적는다.

- [ ] **Step 4: why 기록**

사용자가 느끼는 동작이 바뀌지 않는다 (웹에서 새 주소는 404). `docs/decisions`는 쓰지 않는다. AI 실수를 고친 게 있으면 `docs/ai-usage/mistakes.md`에 한 줄.

- [ ] **Step 5: PR**

```bash
git push -u origin feat/<n>-macos-e1-next
gh pr create --title "feat(infra): macOS 앱 E1, Next 준비 (#<n>)" --body "$(cat <<'EOF'
## 개요
맥 앱이 쓸 Next 쪽 준비. 웹 버전과 Vercel 데모는 바뀌지 않는다.

closes #<n>

## 변경
- `HATCH_STANDALONE=1 npm run build`로 standalone 서버
- `GET /api/app/status`, `POST /api/app/ideas`. `HATCH_APP_TOKEN`이 없으면 404
- 문서, 확인 질문, 도구 실행의 시작과 끝을 서버 메모리 작업 목록에
- spec을 구현에 맞춤 (standalone 조건, 작업 목록 위치, 실패 알림 문구)

## 검증
- `npm run lint && npm run typecheck && npm test && npm run build`: (결과)
- standalone 서버에서 curl로 401, 200, 아이디어 저장 확인: (결과)
- 웹 dev 서버에서 `/api/app/status` 404, 화면 그대로: (결과)

## 리뷰어 결과
(hatch-reviewer 결과)

## why 기록
사용자 동작 변화 없음. 설계 이유는 spec에.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: 사용자 승인 뒤 squash 머지**

승인을 받기 전에는 머지하지 않는다.

---

## E2부터는 따로 plan을 쓴다
E1의 주소 모양이 정해진 뒤, 각 PR을 시작할 때 `docs/plans/2026-11-xx-macos-e<k>-<주제>.md`로 쓴다. Swift 쪽은 Xcode 프로젝트를 만든 뒤에야 파일 경로와 테스트 명령이 정해지기 때문이다.

| PR | plan을 쓸 때 먼저 정할 것 |
| --- | --- |
| E2 앱 뼈대 | Xcode 프로젝트 만드는 법(`xcodegen` 같은 새 도구 없이 Xcode 기본 템플릿), `swift test`로 돌릴 로직 패키지 분리, 시스템 Node로 띄우는 개발 모드 |
| E3 첫 실행과 설정 | claude 찾기 순서 테스트용 가짜 폴더 구조, 키체인 래퍼 |
| E4 메뉴와 메뉴 막대 | 웹 화면 이동을 Swift에서 부르는 방법(주소 이동만 쓸지) |
| E5 알림 | `/api/app/status` 디코더, 본 알림 기억 |
| E6 패키징 | Node universal 받는 곳과 확인값, 서명 순서, 공증 프로필 이름 |
| E7 자동 업데이트 | Sparkle을 Swift Package로 넣는 판, appcast 만드는 스크립트 |
