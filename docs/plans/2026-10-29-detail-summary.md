# 아이디어 상세 재구성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이디어 상세를 열자마자 문제 · 근거/모르는 것 · 결정 · 다음 행동이 보이고, 문서 6개는 탭으로 하나씩 연다.

**Architecture:** 요약은 `src/lib/summary/`의 순수 함수 `summarize()`가 이미 읽은 값(문서 · 생성 중 · VOC · PRD 리뷰)으로 계산한다(AI 호출 없음). 페이지(서버)가 도구 결과 2종을 더 읽어 요약을 만들고, client 화면은 머리(읽기/수정) → 요약 판 → 문서 탭 순서로 그린다.

**Tech Stack:** Next.js 16 App Router · Montage UI (`@montage-ui/core` Emotion) · vitest

Spec: [docs/specs/2026-10-29-detail-summary-design.md](../specs/2026-10-29-detail-summary-design.md) · 이슈 #39 · 브랜치 `feat/39-detail-summary`

## Global Constraints
- 요약은 코드로 계산한다. AI를 부르지 않는다 ("AI는 판단, 코드는 계산")
- `src/lib/summary`는 storage **타입**과 `src/lib/tbd.ts`만 import. 화면 · storage 함수 import 금지
- storage · `@/lib/storage` 함수 호출은 `page.tsx`에서만 (src/app/CLAUDE.md)
- Montage 토큰만 (`theme.semantic.*` 함수 sx 또는 `color="semantic.…"`). hex · `var(--semantic-…)` 직접 금지
- 화면 문구 · 커밋 · PR은 한국어. 커밋 `<type>(<area>): 내용 (#39)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 데모(`useDemo()`)에선 "수정" 버튼 없음. 탭 안 생성 자리는 기존대로 `UseLocallyButton`
- 보이는 최대 개수: 모르는 것 5개(+ "외 N개") · 결정 5개
- 선택 탭은 URL에 남기지 않는다
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

## 파일 지도
| 파일 | 할 일 |
| --- | --- |
| `src/lib/tbd.ts` (← `src/app/_components/tbd.ts` 이동) | `TBD` 정규식을 export, 라벨 캡처 그룹 추가 |
| `src/lib/tbd.test.ts` (← 이동) | import 경로만 |
| `src/app/_components/code-block.tsx` | import 경로 `@/lib/tbd` |
| `src/lib/summary/parse.ts` + `parse.test.ts` | 절 추출 · 첫 문단 · 모르는 것 묶기 · 결정 항목 |
| `src/lib/summary/index.ts` + `index.test.ts` | 타입 · `summarize` · `vocEvidence` |
| `src/app/ideas/[id]/page.tsx` | VOC · PRD 리뷰 결과 읽기 → `summary` 넘기기 |
| `src/app/ideas/[id]/idea-summary.tsx` (새) | 요약 판 4칸 |
| `src/app/ideas/[id]/doc-tabs.tsx` (새) | Montage Tab + 상태 + 첫 탭 규칙 |
| `src/app/ideas/[id]/doc-card.tsx` | 제목 줄 · 테두리 · `maxHeight` 제거 (탭 안 내용만) |
| `src/app/ideas/[id]/idea-detail.tsx` | 머리(읽기/수정) · 요약 판 · 탭 배치 |
| `docs/decisions/2026-10-29_상세-요약-판.md` + README 표 | why 기록 |

---

### Task 1: `tbd.ts` 옮기기 + 요약 파서

**Files:**
- Move: `src/app/_components/tbd.ts` → `src/lib/tbd.ts`, `src/app/_components/tbd.test.ts` → `src/lib/tbd.test.ts`
- Modify: `src/app/_components/code-block.tsx:13`
- Create: `src/lib/summary/parse.ts`, `src/lib/summary/parse.test.ts`

**Interfaces:**
- Produces: `TBD: RegExp` (`/\[확인 필요([^\]]*)\]/g`, 그룹 1 = `:` 포함 라벨 부분), `splitTbd` (동작 그대로)
- Produces: `section(md: string, title: string): string | null` · `firstParagraph(text: string): string` · `countUnknowns(texts: string[]): { label: string; count: number }[]` · `planDecisions(plan: string): string[]` · `UNNAMED = '이름 없음'`

- [x] **Step 1: 파일 옮기기**

```bash
git mv src/app/_components/tbd.ts src/lib/tbd.ts
git mv src/app/_components/tbd.test.ts src/lib/tbd.test.ts
```
`src/app/_components/code-block.tsx`의 `import { splitTbd } from './tbd';` → `import { splitTbd } from '@/lib/tbd';` (import 묶음 순서는 파일의 기존 `@/` import 자리에 맞춘다). `tbd.test.ts`는 `'./tbd'` 그대로 동작.

`src/lib/tbd.ts`의 정규식을 export하고 라벨 그룹을 넣는다 (`splitTbd`는 `m[0]`만 쓰므로 영향 없음):

```ts
/** `[확인 필요]` · `[확인 필요: 라벨]`. 그룹 1 = 라벨 부분(앞의 `:` 포함). 닫는 `]`가 없으면 잡지 않는다 */
export const TBD = /\[확인 필요([^\]]*)\]/g;
```

- [x] **Step 2: 파서 실패 테스트 쓰기** — `src/lib/summary/parse.test.ts`

```ts
import { describe, expect, it } from 'vitest';

import { countUnknowns, firstParagraph, planDecisions, section, UNNAMED } from './parse';

const PLAN = `# 제목

## 문제
첫 문단 한 줄.
이어지는 줄.

둘째 문단.

## 문제점 비교
다른 절

## 확인 필요
- 수요가 있는가? [확인 필요: 사용자 조사]
- 첫 출시 지역을 어디로 할 것인가?
  들여쓴 줄은 항목이 아니다

## 메모
끝`;

describe('section', () => {
  it('정확히 같은 제목 줄부터 다음 ## 전까지', () => {
    expect(section(PLAN, '문제')).toBe('첫 문단 한 줄.\n이어지는 줄.\n\n둘째 문단.');
  });
  it('제목 앞뒤 공백은 무시', () => {
    expect(section('##  문제  \n본문', '문제')).toBe('본문');
  });
  it('없으면 null', () => {
    expect(section(PLAN, '위험')).toBeNull();
  });
});

describe('firstParagraph', () => {
  it('빈 줄 앞까지', () => {
    expect(firstParagraph('\n\n가\n나\n\n다')).toBe('가\n나');
  });
  it('빈 글이면 빈 문자열', () => {
    expect(firstParagraph('  \n ')).toBe('');
  });
});

describe('countUnknowns', () => {
  it('라벨(공백 정리)로 묶고 많은 순, 같으면 처음 나온 순', () => {
    const texts = ['[확인 필요: 지역] [확인 필요:  결제   방식 ]', '[확인 필요: 결제 방식] [확인 필요: 동의]'];
    expect(countUnknowns(texts)).toEqual([
      { label: '결제 방식', count: 2 },
      { label: '지역', count: 1 },
      { label: '동의', count: 1 },
    ]);
  });
  it('라벨 없는 자리는 "이름 없음"으로 묶는다', () => {
    expect(countUnknowns(['[확인 필요] 그리고 [확인 필요]'])).toEqual([{ label: UNNAMED, count: 2 }]);
  });
  it('형식 설명용 ○○ 자리와 닫히지 않은 자리는 세지 않는다', () => {
    expect(countUnknowns(['`[확인 필요: ○○]`로 표시', '[확인 필요: 끝없음'])).toEqual([]);
  });
});

describe('planDecisions', () => {
  it('## 확인 필요 절의 "- " 항목, 끝 꼬리표는 뗀다', () => {
    expect(planDecisions(PLAN)).toEqual(['수요가 있는가?', '첫 출시 지역을 어디로 할 것인가?']);
  });
  it('절이 없으면 빈 배열', () => {
    expect(planDecisions('## 문제\n가')).toEqual([]);
  });
});
```

- [x] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/summary/parse.test.ts`
Expected: FAIL — `Cannot find module './parse'` (또는 Failed to resolve import)

- [x] **Step 4: 구현** — `src/lib/summary/parse.ts`

```ts
import { TBD } from '../tbd';

export const UNNAMED = '이름 없음';
// 프롬프트 문서가 "`[확인 필요: ○○]`로 표시된 정책은…"처럼 형식을 설명할 때 쓰는 자리
const PLACEHOLDER = '○○';
const TAIL = /\s*\[확인 필요[^\]]*\]\s*$/;

/** `## 제목` 줄부터 다음 `## ` 줄 전까지 (제목은 앞뒤 공백 무시하고 정확히 일치) */
export function section(md: string, title: string): string | null {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && l.slice(2).trim() === title);
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

export function firstParagraph(text: string): string {
  return text.trim().split(/\n\s*\n/)[0]?.trim() ?? '';
}

/** 모든 `[확인 필요: X]`를 X로 묶어 센다. 많은 순, 같으면 처음 나온 순 (Map 삽입 순 + 안정 정렬) */
export function countUnknowns(texts: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const m of text.matchAll(TBD)) {
      const label = m[1].replace(/^\s*:/, '').replace(/\s+/g, ' ').trim() || UNNAMED;
      if (label === PLACEHOLDER) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** 기획안 `## 확인 필요` 절의 `- ` 항목 (끝 꼬리표 뗌). 4a(결정 기록)에서 사람이 고른 결정으로 바뀐다 */
export function planDecisions(plan: string): string[] {
  const body = section(plan, '확인 필요');
  if (!body) return [];
  return body
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).replace(TAIL, '').trim())
    .filter(Boolean);
}
```

- [x] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/summary/parse.test.ts src/lib/tbd.test.ts`
Expected: PASS (파서 10개 + tbd 5개)

- [x] **Step 6: 커밋**

```bash
git add src/lib/tbd.ts src/lib/tbd.test.ts src/app/_components/code-block.tsx src/lib/summary/parse.ts src/lib/summary/parse.test.ts
git commit -m "feat(bank): 상세 요약용 문서 파서 (#39)"
```

---

### Task 2: `summarize` · `vocEvidence`

**Files:**
- Create: `src/lib/summary/index.ts`, `src/lib/summary/index.test.ts`

**Interfaces:**
- Consumes: Task 1의 `section` · `firstParagraph` · `countUnknowns` · `planDecisions`; `Doc` · `DocKey` · `DOC_STEPS` (`@/lib/storage/types`)
- Produces (Task 3 · 4가 쓴다):

```ts
export type VocEvidence = { total: number; top: string };
export type NextAction =
  | { kind: 'wait'; doc: DocKey }
  | { kind: 'check-stale'; doc: DocKey }
  | { kind: 'make-doc'; doc: DocKey }
  | { kind: 'collect-voc' }
  | { kind: 'review-prd' }
  | { kind: 'done' };
export type SummaryInput = { idea: { title: string; memo: string }; docs: Doc[]; running: DocKey | null; voc: VocEvidence | null; reviewedPrd: boolean };
export type Summary = {
  problem: { text: string; from: 'plan' | 'memo' | 'title' };
  evidence: { voc: VocEvidence | null };
  unknowns: { label: string; count: number }[]; // 최대 5
  unknownTotal: number; // 묶은 뒤 종류 수
  decisions: string[]; // 최대 5
  next: NextAction;
};
export function summarize(input: SummaryInput): Summary;
export function vocEvidence(data: unknown): VocEvidence | null;
```

- [x] **Step 1: 실패 테스트 쓰기** — `src/lib/summary/index.test.ts`

```ts
import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Doc, type DocKey } from '@/lib/storage/types';

import { summarize, vocEvidence, type SummaryInput } from './index';

const PLAN = '## 문제\n퇴근 후 클래스를 찾기 어렵다. [확인 필요: 불편 빈도]\n\n둘째 문단\n\n## 확인 필요\n- 지역은? [확인 필요: 지역]\n';
const ALL: Partial<Record<DocKey, string>> = { plan: PLAN, roadmap: 'r', prd: 'p', spec: 's', 'dev-prompt': 'd', 'design-prompt': 'g' };

const docsWith = (content: Partial<Record<DocKey, string>>, stale: DocKey[] = []): Doc[] =>
  DOC_STEPS.map((s) => ({ ...s, content: content[s.key] ?? null, stale: stale.includes(s.key) }));

const input = (over: Partial<SummaryInput> = {}): SummaryInput => ({
  idea: { title: '퇴근 후 원데이 클래스', memo: '' },
  docs: docsWith(ALL),
  running: null,
  voc: { total: 30, top: '예약' },
  reviewedPrd: true,
  ...over,
});

describe('다음 행동', () => {
  it('1. 생성 중이면 기다림', () => {
    expect(summarize(input({ running: 'prd', docs: docsWith(ALL, ['spec']) })).next).toEqual({ kind: 'wait', doc: 'prd' });
  });
  it('2. 내용 있고 바뀐 문서 중 가장 앞', () => {
    expect(summarize(input({ docs: docsWith(ALL, ['spec', 'roadmap']) })).next).toEqual({ kind: 'check-stale', doc: 'roadmap' });
  });
  it('2. 내용 없는 문서의 stale은 무시', () => {
    expect(summarize(input({ docs: docsWith({ plan: PLAN }, ['roadmap']), voc: { total: 1, top: 'a' } })).next).toEqual({
      kind: 'make-doc',
      doc: 'roadmap',
    });
  });
  it('3. 기획안 없음 → 기획안 만들기', () => {
    expect(summarize(input({ docs: docsWith({}) })).next).toEqual({ kind: 'make-doc', doc: 'plan' });
  });
  it('4. VOC 없고 모르는 것 있음 → 고객 의견 모으기', () => {
    expect(summarize(input({ voc: null })).next).toEqual({ kind: 'collect-voc' });
  });
  it('4. VOC 없어도 모르는 것이 없으면 건너뛴다', () => {
    expect(summarize(input({ voc: null, docs: docsWith({ ...ALL, plan: '## 문제\n가' }) })).next).toEqual({ kind: 'done' });
  });
  it('5. PRD 있고 리뷰 없음 → PRD 리뷰', () => {
    expect(summarize(input({ reviewedPrd: false })).next).toEqual({ kind: 'review-prd' });
  });
  it('6. 내용 없는 첫 문서 만들기', () => {
    expect(summarize(input({ docs: docsWith({ plan: PLAN, roadmap: 'r' }) })).next).toEqual({ kind: 'make-doc', doc: 'prd' });
  });
  it('7. 전부 있음 → 끝', () => {
    expect(summarize(input()).next).toEqual({ kind: 'done' });
  });
});

describe('해결하려는 문제', () => {
  it('기획안 ## 문제 첫 문단 (확인 필요 그대로)', () => {
    expect(summarize(input()).problem).toEqual({ text: '퇴근 후 클래스를 찾기 어렵다. [확인 필요: 불편 빈도]', from: 'plan' });
  });
  it('기획안이 없으면 메모 첫 문단', () => {
    const s = summarize(input({ docs: docsWith({}), idea: { title: 't', memo: '메모 첫 줄\n\n둘째' } }));
    expect(s.problem).toEqual({ text: '메모 첫 줄', from: 'memo' });
  });
  it('메모도 없으면 제목', () => {
    expect(summarize(input({ docs: docsWith({}) })).problem).toEqual({ text: '퇴근 후 원데이 클래스', from: 'title' });
  });
});

describe('모르는 것 · 결정', () => {
  it('모든 문서에서 묶고 5개까지, 종류 수는 따로', () => {
    const many = Array.from({ length: 7 }, (_, i) => `[확인 필요: 항목${i}]`).join(' ');
    const s = summarize(input({ docs: docsWith({ ...ALL, prd: many }) }));
    expect(s.unknowns).toHaveLength(5);
    expect(s.unknownTotal).toBe(9); // 불편 빈도 · 지역 · 항목0~6
  });
  it('결정은 꼬리표를 뗀 기획안 확인 필요 항목, 최대 5개', () => {
    const plan = '## 확인 필요\n' + Array.from({ length: 6 }, (_, i) => `- 질문${i} [확인 필요: x]`).join('\n');
    const s = summarize(input({ docs: docsWith({ ...ALL, plan }) }));
    expect(s.decisions).toEqual(['질문0', '질문1', '질문2', '질문3', '질문4']);
  });
  it('기획안이 없으면 결정 없음', () => {
    expect(summarize(input({ docs: docsWith({}) })).decisions).toEqual([]);
  });
});

describe('vocEvidence', () => {
  it('total · 1위 주제 이름', () => {
    expect(vocEvidence({ total: 42, topics: [{ name: '예약 실패' }, { name: '가격' }] })).toEqual({ total: 42, top: '예약 실패' });
  });
  it.each([null, undefined, 'x', {}, { total: '3', topics: [] }, { total: 3, topics: [] }, { total: 3, topics: [{}] }])(
    '모양이 다르면 null: %j',
    (data) => {
      expect(vocEvidence(data)).toBeNull();
    },
  );
});
```

- [x] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/summary/index.test.ts`
Expected: FAIL — `./index` 해석 실패

- [x] **Step 3: 구현** — `src/lib/summary/index.ts`

```ts
// 아이디어 상세 요약 판. 이미 읽은 값만으로 계산한다 — AI 없이 즉시 · 무료 · 같은 문서면 같은 요약
import { countUnknowns, firstParagraph, planDecisions, section } from './parse';

import type { Doc, DocKey } from '../storage/types';

export type VocEvidence = { total: number; top: string };

export type NextAction =
  | { kind: 'wait'; doc: DocKey }
  | { kind: 'check-stale'; doc: DocKey }
  | { kind: 'make-doc'; doc: DocKey }
  | { kind: 'collect-voc' }
  | { kind: 'review-prd' }
  | { kind: 'done' };

export type SummaryInput = {
  idea: { title: string; memo: string };
  docs: Doc[];
  running: DocKey | null;
  /** 이 아이디어의 최신 VOC 결과 */
  voc: VocEvidence | null;
  /** 이 아이디어 PRD로 돌린 PRD 리뷰가 있나 */
  reviewedPrd: boolean;
};

export type Summary = {
  problem: { text: string; from: 'plan' | 'memo' | 'title' };
  evidence: { voc: VocEvidence | null };
  unknowns: { label: string; count: number }[];
  unknownTotal: number;
  decisions: string[];
  next: NextAction;
};

const MAX = 5;

/** VOC 결과 data에서 근거 한 줄. 모양이 다르면 null — 깨진 결과로 화면이 죽지 않게 */
export function vocEvidence(data: unknown): VocEvidence | null {
  if (typeof data !== 'object' || data === null) return null;
  const { total, topics } = data as { total?: unknown; topics?: unknown };
  if (typeof total !== 'number' || !Array.isArray(topics)) return null;
  const top: unknown = (topics[0] as { name?: unknown } | undefined)?.name;
  return typeof top === 'string' ? { total, top } : null;
}

function problemOf(idea: SummaryInput['idea'], plan: string | null): Summary['problem'] {
  const fromPlan = plan ? firstParagraph(section(plan, '문제') ?? '') : '';
  if (fromPlan) return { text: fromPlan, from: 'plan' };
  const fromMemo = firstParagraph(idea.memo);
  if (fromMemo) return { text: fromMemo, from: 'memo' };
  return { text: idea.title, from: 'title' };
}

// 위에서부터 첫 번째 하나 (spec §3 다음 행동 규칙)
function nextOf({ docs, running, voc, reviewedPrd }: SummaryInput, unknownTotal: number): NextAction {
  if (running) return { kind: 'wait', doc: running };
  const stale = docs.find((d) => d.content !== null && d.stale);
  if (stale) return { kind: 'check-stale', doc: stale.key };
  const has = (key: DocKey) => docs.some((d) => d.key === key && d.content !== null);
  if (!has('plan')) return { kind: 'make-doc', doc: 'plan' };
  if (!voc && unknownTotal > 0) return { kind: 'collect-voc' };
  if (has('prd') && !reviewedPrd) return { kind: 'review-prd' };
  const missing = docs.find((d) => d.content === null);
  if (missing) return { kind: 'make-doc', doc: missing.key };
  return { kind: 'done' };
}

export function summarize(input: SummaryInput): Summary {
  const plan = input.docs.find((d) => d.key === 'plan')?.content ?? null;
  const unknowns = countUnknowns(input.docs.flatMap((d) => (d.content === null ? [] : [d.content])));
  return {
    problem: problemOf(input.idea, plan),
    evidence: { voc: input.voc },
    unknowns: unknowns.slice(0, MAX),
    unknownTotal: unknowns.length,
    decisions: plan ? planDecisions(plan).slice(0, MAX) : [],
    next: nextOf(input, unknowns.length),
  };
}
```

- [x] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/summary`
Expected: PASS (index 23개 · parse 10개)

- [x] **Step 5: 커밋**

```bash
git add src/lib/summary/index.ts src/lib/summary/index.test.ts
git commit -m "feat(bank): 아이디어 요약 · 다음 행동 계산 (#39)"
```

---

### Task 3: 페이지가 요약을 만든다

**Files:**
- Modify: `src/app/ideas/[id]/page.tsx`

**Interfaces:**
- Consumes: `summarize` · `vocEvidence` (`@/lib/summary`), `listToolResults(tool, ideaId, source?)` (`@/lib/storage`, 최신이 [0])
- Produces: `IdeaDetail`에 새 prop `summary: Summary`, `ideaId: string` (Task 4가 받는다 — 도구 링크용)

- [x] **Step 1: page.tsx 수정**

import에 추가:
```ts
import { getDocs, getIdea, getRunning, isValidId, listToolResults } from '@/lib/storage';
import { summarize, vocEvidence } from '@/lib/summary';
```
본문 읽기 부분을 아래로 바꾼다:
```ts
  // 결과 파일을 못 읽으면 근거 · 리뷰 여부만 없는 것으로 보고 나머지는 그린다 (spec §5)
  const [docs, running, vocs, reviews] = await Promise.all([
    getDocs(id),
    getRunning(id),
    listToolResults('voc', id).catch(() => []),
    listToolResults('prd-review', id, 'prd').catch(() => []),
  ]);
  const runningKey = running?.key ?? null;
  const summary = summarize({
    idea: { title: idea.title, memo: idea.memo },
    docs,
    running: runningKey,
    voc: vocEvidence(vocs[0]?.data),
    reviewedPrd: reviews.length > 0,
  });
```
`<IdeaDetail …>`에 `ideaId={id}` · `summary={summary}` 추가, `running={runningKey}`로.

- [x] **Step 2: 타입 확인** — Task 4 전이라 `IdeaDetail` Props에 없는 prop 오류가 난다. 이 Task는 Task 4와 한 커밋으로 묶는다 (Step 3 없음, Task 4 Step 6에서 같이 커밋).

---

### Task 4: 상세 화면 — 머리 · 요약 판 · 문서 탭

**Files:**
- Create: `src/app/ideas/[id]/idea-summary.tsx`, `src/app/ideas/[id]/doc-tabs.tsx`
- Modify: `src/app/ideas/[id]/idea-detail.tsx`, `src/app/ideas/[id]/doc-card.tsx`

**Interfaces:**
- Consumes: `Summary` · `NextAction` (`@/lib/summary` — 타입만), Task 3의 `summary` · `ideaId` prop
- Montage Tab API (`node_modules/@montage-ui/core/dist/components/tab/types.d.ts`): `Tab {value, onValueChange(tab: string)}` · `TabList {size, resize: 'hug'|'fill'}` · `TabListItem {value}` · `TabPanel {value, mountMode}`
- Produces: `IdeaSummary({ summary, ideaId, onOpenDoc(key: DocKey) })` · `DocTabs({ docs, value, onChange(key: DocKey), render(doc: Doc): ReactNode })` · `firstTab(docs, next): DocKey`

- [x] **Step 1: `doc-card.tsx` — 탭 안 내용만**

  - `index` prop과 Props 주석 삭제, `boxStyle` · `bodyStyle` 삭제
  - 바깥 `<Box sx={boxStyle}>` → `<Box>`; 제목 `<Typography variant="headline2">{index + 1}. {doc.label}</Typography>` 줄 삭제 (탭 이름이 대신한다). 배지 FlexBox(파일명 · "앞 문서가 바뀌었어요")는 남긴다
  - 본문 `<Typography as="div" variant="body2" sx={bodyStyle}>` → `sx` 없이 (페이지 스크롤 하나로)
  - `Theme` type import가 안 쓰이면 지운다

- [x] **Step 2: `doc-tabs.tsx` 새로**

```tsx
'use client';

import { Box, FlexBox, Tab, TabList, TabListItem, TabPanel } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';
import type { ReactNode } from 'react';

import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction } from '@/lib/summary';

type Status = 'has' | 'none' | 'stale' | 'running';

const LABELS: Record<Status, string> = { has: '있음', none: '아직 없음', stale: '앞 문서가 바뀜', running: '만드는 중' };

const statusOf = (doc: Doc, running: DocKey | null): Status =>
  running === doc.key ? 'running' : doc.content === null ? 'none' : doc.stale ? 'stale' : 'has';

const dotColor = (status: Status) => (theme: Theme) =>
  ({
    has: theme.semantic.primary.normal,
    none: theme.semantic.line.neutral.primary,
    stale: theme.semantic.foreground.cautionary.primary,
    running: theme.semantic.foreground.neutral.quaternary,
  })[status];

/** 처음 여는 탭: 다음 행동이 가리키는 문서 → 내용 있는 마지막 문서 → 기획안 */
export function firstTab(docs: Doc[], next: NextAction): DocKey {
  if ('doc' in next) return next.doc;
  return docs.findLast((d) => d.content !== null)?.key ?? 'plan';
}

type Props = {
  docs: Doc[];
  running: DocKey | null;
  value: DocKey;
  onChange: (key: DocKey) => void;
  render: (doc: Doc) => ReactNode;
};

export default function DocTabs({ docs, running, value, onChange, render }: Props) {
  return (
    <Tab value={value} onValueChange={(v) => onChange(v as DocKey)}>
      <TabList size="medium" resize="hug">
        {docs.map((doc) => {
          const status = statusOf(doc, running);
          return (
            <TabListItem key={doc.key} value={doc.key}>
              <FlexBox alignItems="center" gap="6px" aria-label={`${doc.label} · ${LABELS[status]}`}>
                <Box
                  aria-hidden
                  sx={(theme: Theme) => ({ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor(status)(theme) })}
                />
                {doc.label}
              </FlexBox>
            </TabListItem>
          );
        })}
      </TabList>
      {docs.map((doc) => (
        <TabPanel key={doc.key} value={doc.key} mountMode="only-active" sx={{ paddingTop: '16px' }}>
          {render(doc)}
        </TabPanel>
      ))}
    </Tab>
  );
}
```
  `theme.semantic.primary.normal`이 없으면 `node_modules/@montage-ui/core`의 테마 타입에서 기본 강조 색 토큰을 찾아 바꾼다 (typecheck가 알려 준다). `findLast`가 lib 설정에 없으면 `[...docs].reverse().find(...)`로.

- [x] **Step 3: `idea-summary.tsx` 새로**

```tsx
'use client';

import Link from 'next/link';
import { Box, Button, FlexBox, respondMore, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction, Summary } from '@/lib/summary';

type Props = { summary: Summary; docs: Doc[]; ideaId: string; onOpenDoc: (key: DocKey) => void };

const cellStyle = (theme: Theme) => ({
  border: `1px solid ${theme.semantic.line.neutral.primary}`,
  borderRadius: '12px',
  padding: '16px',
});

// 넓으면 2열, 좁으면 1열
const gridStyle = { display: 'grid', gap: '12px', gridTemplateColumns: '1fr', [respondMore('768px')]: { gridTemplateColumns: '1fr 1fr' } };

const Cell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={cellStyle}>
    <Typography as="h3" variant="label1" weight="bold" color="semantic.foreground.neutral.secondary" sx={{ marginBottom: '8px' }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const text = (t: React.ReactNode) => (
  <Typography as="p" variant="body2" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

const items = (list: React.ReactNode[]) => (
  <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
    {list.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </Typography>
);

function NextCell({ next, docs, ideaId, onOpenDoc }: { next: NextAction } & Omit<Props, 'summary'>) {
  const label = (key: DocKey) => docs.find((d) => d.key === key)?.label ?? key;
  const open = (key: DocKey, title: string) => (
    <Button size="small" onClick={() => onOpenDoc(key)}>
      {title}
    </Button>
  );
  const go = (href: string, title: string) => (
    <Button as={Link} href={href} size="small">
      {title}
    </Button>
  );
  switch (next.kind) {
    case 'wait':
      return text(`${label(next.doc)} 만드는 중이에요.`);
    case 'check-stale':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text(`앞 문서가 바뀌었어요. ${label(next.doc)}이 아직 예전 내용이에요.`)}
          {open(next.doc, `${label(next.doc)} 확인하기`)}
        </FlexBox>
      );
    case 'make-doc':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text(`다음 문서는 ${label(next.doc)}예요.`)}
          {open(next.doc, `${label(next.doc)} 열기`)}
        </FlexBox>
      );
    case 'collect-voc':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text('모르는 것이 남았는데 고객 근거가 없어요. 고객 의견부터 모아 봐요.')}
          {go(`/tools/voc?idea=${ideaId}`, '고객 의견 정리하기')}
        </FlexBox>
      );
    case 'review-prd':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text('PRD를 아직 리뷰받지 않았어요.')}
          {go(`/tools/prd-review?idea=${ideaId}`, 'PRD 리뷰 받기')}
        </FlexBox>
      );
    case 'done':
      return text('문서가 모두 있어요. 바뀐 게 생기면 여기서 알려 줘요.');
  }
}

export default function IdeaSummary({ summary, docs, ideaId, onOpenDoc }: Props) {
  const { problem, evidence, unknowns, unknownTotal, decisions, next } = summary;
  const rest = unknownTotal - unknowns.length;
  return (
    <Box sx={gridStyle}>
      <Cell title="해결하려는 문제">{text(problem.text)}</Cell>
      <Cell title="확인된 근거 · 모르는 것">
        <FlexBox flexDirection="column" gap="8px">
          {text(evidence.voc ? `고객 의견 ${evidence.voc.total}줄 · 1위 ${evidence.voc.top}` : '아직 고객 근거가 없어요.')}
          {unknowns.length > 0 &&
            items([...unknowns.map((u) => `${u.label} ${u.count}곳`), ...(rest > 0 ? [`외 ${rest}개`] : [])])}
        </FlexBox>
      </Cell>
      {decisions.length > 0 && <Cell title="지금 내려야 할 결정">{items(decisions)}</Cell>}
      <Cell title="추천 다음 행동">
        <NextCell next={next} docs={docs} ideaId={ideaId} onOpenDoc={onOpenDoc} />
      </Cell>
    </Box>
  );
}
```
  `Typography`의 `variant="label1"`이 없으면 typecheck 오류 → `body2` + `weight="bold"`로.

- [x] **Step 4: `idea-detail.tsx` — 머리 · 요약 · 탭 배치**

  Props에 `ideaId: string` · `summary: Summary` 추가 (`import type { Summary } from '@/lib/summary';`). 본문을 아래로 바꾼다 (busy · generating · useRefreshWhile · confirmTrash는 그대로 둔다):

```tsx
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<DocKey>(() => firstTab(docs, summary.next));
  // 저장에 성공하면 읽기로 돌아간다
  const saveIdea = async (prev: FormState, fd: FormData) => {
    const next = await updateAction(prev, fd);
    if (!next.error) setEditing(false);
    return next;
  };

  return (
    <>
      <FlexBox justifyContent="space-between" alignItems="flex-start" gap="12px">
        <PageHeader title={idea.title} description={idea.memo || undefined} />
        {!demo && !editing && (
          <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(true)} disabled={generating}>
            수정
          </Button>
        )}
      </FlexBox>

      {editing && (
        <Box sx={{ marginBottom: '24px' }}>
          <IdeaForm action={saveIdea} submitLabel="수정 저장" initial={idea} disabled={generating} />
          <FlexBox justifyContent="space-between" sx={{ marginTop: '8px' }}>
            <form action={trashAction} onSubmit={confirmTrash}>
              <Button type="submit" variant="outlined" color="assistive" size="small" disabled={generating}>
                휴지통으로
              </Button>
            </form>
            <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(false)}>
              취소
            </Button>
          </FlexBox>
        </Box>
      )}

      <IdeaSummary summary={summary} docs={docs} ideaId={ideaId} onOpenDoc={setTab} />

      <SectionTitle>문서</SectionTitle>
      <DocTabs
        docs={docs}
        running={busy ?? running}
        value={tab}
        onChange={setTab}
        render={(doc) => (
          <DocCard
            doc={doc}
            ready={generatable.includes(doc.key)}
            hasSource={doc.from === 'idea' || docs.find((d) => d.key === doc.from)?.content != null}
            running={busy ?? running}
            onBusy={setBusy}
            generate={generateAction}
            update={updateDocAction}
          />
        )}
      />
    </>
  );
```
  import: `Box` 추가, `IdeaSummary` (`./idea-summary`), `DocTabs, { firstTab }` (`./doc-tabs`), `FormState` 타입은 이미 있음. 메모가 여러 줄이면 PageHeader가 한 덩어리로 보여 준다 — 그대로 둔다(YAGNI).
  탭 패널이 `only-active`라 탭을 옮기면 DocCard 편집 중 상태가 사라진다. 의도된 동작(편집은 탭 하나에서 끝낸다).
  → **최종 리뷰에서 바꿈**: 탭을 옮기면 생성 오류 문구까지 사라져서 `mountMode`를 빼 기본값(한 번 연 탭은 유지)으로. 탭 안 요소는 Montage가 `<p>`로 감싸므로 모두 span.

- [x] **Step 5: 검사**

Run: `npm run lint && npm run typecheck && npm test`
Expected: 모두 통과. 실패하면 위 Step의 대체 지시(토큰 · variant · findLast)대로 고친다.

- [x] **Step 6: 커밋 (Task 3 포함)**

```bash
git add "src/app/ideas/[id]"
git commit -m "feat(bank): 상세를 요약 판 + 문서 탭으로 (#39)"
```

---

### Task 5: 화면 확인 · why 기록 · PR

**Files:**
- Create: `docs/decisions/2026-10-29_상세-요약-판.md`
- Modify: `docs/decisions/README.md` (표 끝에 한 줄), 이 plan 체크박스

- [x] **Step 1: 전체 검증**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 통과 (테스트 146 + 신규)

- [x] **Step 2: 데모 모드 화면 확인** — launch.json `hatch-demo`(3110, build 필요)로 띄워 샘플 3개를 연다

| 샘플 | 기대 |
| --- | --- |
| `/ideas/20261028-1441-n9rp` (문서 6 · VOC · PRD 리뷰) | 근거 "고객 의견 N줄 · 1위 …", 모르는 것 5줄 + "외 N개", 결정 칸, 다음 행동 = 끝(또는 바뀐 문서 확인), 첫 탭 = 마지막 문서, 탭 6개 상태 점 |
| `/ideas/20261028-1828-83bl` (기획안만) | 문제 = 기획안, 다음 행동 = 고객 의견 정리하기(`/tools/voc?idea=…`), 첫 탭 = 기획안 |
| `/ideas/20261028-1828-auxd` (아이디어만) | 문제 = 메모/제목, 근거 없음, 결정 칸 없음, 다음 행동 = 기획안 열기 → 기획안 탭 · "내 환경에서 사용하기" |

  공통: "수정" 버튼 없음, 콘솔 오류 없음(로컬 prod의 기존 React #418은 제외 — main에도 있음), 폭 375px에서 1열 · 탭 가로 스크롤.

- [x] **Step 3: 일반 모드 확인** — `HATCH_DATA_DIR`를 임시 폴더로 dev 서버, 아이디어 하나 저장 → 상세: "수정" → 폼 · 휴지통 보임 → 저장하면 읽기로 돌아감 · 취소 동작. 기획안 탭의 "기획안 만들기" 버튼이 보이는지만 확인 (실제 생성은 선택).

- [x] **Step 4: why 기록** — `why` 스킬 형식으로 `docs/decisions/2026-10-29_상세-요약-판.md` (What: 상세를 열면 문제 · 근거/모르는 것 · 결정 · 다음 행동이 먼저 보이고 문서는 탭 / Why: 피드백 4 — 문서 나열이라 현재 상태와 다음 행동이 묻힘 / 판단 근거: 코드 요약이라 즉시 · 데모에서도 보임, 결정 칸은 4a 전 임시) + README 표 한 줄

- [ ] **Step 5: 커밋 · push · PR**

```bash
git add docs/decisions docs/plans/2026-10-29-detail-summary.md
git commit -m "docs(bank): 상세 요약 판 why 기록 (#39)"
git push -u origin feat/39-detail-summary
gh pr create --title "feat(bank): 아이디어 상세를 요약 판 + 문서 탭으로 (#39)" --body-file <템플릿 채운 파일>
```
  PR 템플릿 칸(개요 · closes #39 · 변경 · 검증 결과 · 화면 캡처 · 리뷰어 결과 · why 기록) 모두. 머지는 사용자 승인 후 squash.
