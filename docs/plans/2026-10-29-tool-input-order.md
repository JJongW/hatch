# 도구 입력 순서 · 점수 낮추기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VOC는 고객 의견을 먼저 받고, 협상은 1라운드 결과 안에서 내 답을 받으며, 두 도구 결과에서 점수를 출발점 · 참고로 낮춘다.

**Architecture:** 도구 공통 틀(`_frame`)에 두 가지를 더한다 — `sourceOptional` 도구는 입력 칸을 먼저 · 기본 "문서 없이", 결과 상자 안 이어 실행 입력 자리 `continueFields`. 결과 본문은 각 도구의 `render`만 바꾸고 계산 · 저장 형식은 그대로 둔다.

**Tech Stack:** Next.js 16 App Router · Montage UI · vitest · zod

Spec: [docs/specs/2026-10-29-tool-input-order-design.md](../specs/2026-10-29-tool-input-order-design.md) · 이슈 #41 · 브랜치 `feat/41-tool-input-order`

## Global Constraints
- 계산 · 저장 형식(`VocResult` · `NegotiationResult` · 결과 파일 머리말)은 바꾸지 않는다. 바뀌는 건 `render` 본문 · 도구 설명 · 화면 배치
- PRD 리뷰 · 지표 도구 화면 · 결과는 그대로 (공통 틀 변경이 이 둘에 영향 없어야 한다: 둘은 `sourceOptional` 없음 · `continueFields` 안 넘김)
- Montage 토큰만 (hex · `var(--semantic-…)` 금지). 화면 문구 · 커밋은 한국어. 커밋 `<type>(<area>): 내용 (#41)` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 데모(`useDemo()`)에선 실행 · 이어 실행 입력을 보이지 않는다 (지금 규칙 유지)
- prettier 돌리지 않는다 (프로젝트 설정 없음 → 파일 전체가 바뀜)
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

## 파일 지도
| 파일 | 할 일 |
| --- | --- |
| `src/lib/tools/voc/compute.ts` · `voc.test.ts` | `renderVoc` 새 형식 |
| `src/lib/tools/voc/index.ts` | 설명 · `inputLabel: '고객 의견'` |
| `src/lib/tools/negotiation/compute.ts` · `negotiation.test.ts` | `renderNegotiation` 순서 · 참고 점수 |
| `src/lib/tools/negotiation/index.ts` | 설명 |
| `src/lib/tools/types.ts` | `inputLabel?: string` |
| `src/app/tools/_frame/load.ts` | 기본 문서 없이 · `inputLabel` |
| `src/app/tools/_frame/tool-frame.tsx` | 입력 먼저 · 칸 제목 · `?source=pasted` · `continueFields` |
| `src/app/tools/negotiation/page.tsx` · `inputs.tsx` | 답 칸을 `continueFields`로 |
| `demo-data/ideas/20261028-1441-n9rp/tools/{voc,negotiation}-*.md` | 본문만 다시 만들기 |

---

### Task 1: VOC 결과 본문 — 출발 순위 + 볼 질문

**Files:** Modify `src/lib/tools/voc/compute.ts` (`renderVoc`), `src/lib/tools/voc/voc.test.ts` (`describe('renderVoc')`), `src/lib/tools/voc/index.ts` (description)

**Interfaces:** `renderVoc(r: VocResult): string` 시그니처 그대로. Task 2 · 3과 독립.

- [ ] **Step 1: 테스트를 새 형식으로** — `voc.test.ts`의 첫 `it` 순서 배열과 이름을 바꾸고 질문 · 점수 없음 검사를 더한다

```ts
  it('요약 → 출발 순위 → 볼 것 → 주제별 대표 VOC → 분류 안 됨 순서, "점수"는 쓰지 않는다', () => {
    const md = renderVoc(computeVoc(out, { lines }));
    const order = [
      '## 요약\nVOC 6건 · 주제 3개 · 분류 안 됨 2건',
      '## 출발 순위\n건수 × 평균 심각도로 매긴 출발점이에요. 실제 우선순위는 아래 질문을 보고 정해요.',
      '- **1** 결제 — 건수 2 · 평균 심각도 4 (합 8)',
      '## 순위를 정하기 전에 볼 것\n- 고객군:',
      '- 제품 목표:',
      '- 해결 비용:',
      '## 주제별 대표 VOC',
      '### 1 · 결제\n',
      '- **심각도 5** (1번) 결제가 실패해요',
      '## 분류 안 됨 · 2건',
      '- **주제 없음** (6번) 앱이 꺼져요',
    ];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
    expect(md).not.toContain('점수');
    expect(md).not.toMatch(/\d위/);
  });
```
  두 번째 `it`(분류 안 됨 없음 · 빈 주제)는 그대로 둔다.

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/tools/voc/voc.test.ts` → renderVoc 첫 테스트 FAIL (`## 출발 순위` 없음)

- [ ] **Step 3: `renderVoc` 바꾸기** (`vocLine` · `computeVoc`는 그대로)

```ts
// 점수는 출발점일 뿐 — 최종 우선순위는 사람이 고객군 · 목표 · 비용을 보고 정한다 (피드백 8)
const CHECKS = [
  '고객군: 이 불만은 어느 고객군에서 나왔고, 그 고객군이 지금 목표 고객인가?',
  '제품 목표: 고치면 이번 목표 지표가 움직이나?',
  '해결 비용: 고치는 데 얼마나 드나? 작게 먼저 풀 방법이 있나?',
];

export function renderVoc(r: VocResult) {
  const topics = r.topics.map(
    (t) =>
      `### ${t.rank} · ${t.name}\n${t.description}\n\n` +
      `건수 ${t.count} · 평균 심각도 ${t.average ?? '없음'}\n\n` +
      (t.top.length ? t.top.map(vocLine).join('\n') : '- 이 주제로 분류된 VOC 없음'),
  );
  return [
    `## 요약\nVOC ${r.total}건 · 주제 ${r.topics.length}개 · ${UNCLASSIFIED} ${r.unclassified.count}건`,
    `## 출발 순위\n건수 × 평균 심각도로 매긴 출발점이에요. 실제 우선순위는 아래 질문을 보고 정해요.\n\n` +
      (r.topics.map((t) => `- **${t.rank}** ${t.name} — 건수 ${t.count} · 평균 심각도 ${t.average ?? '없음'} (합 ${t.score})`).join('\n') || '- 주제 없음'),
    `## 순위를 정하기 전에 볼 것\n${CHECKS.map((c) => `- ${c}`).join('\n')}`,
    `## 주제별 대표 VOC`,
    ...topics,
    ...(r.unclassified.count ? [`## ${UNCLASSIFIED} · ${r.unclassified.count}건\n${r.unclassified.top.map(vocLine).join('\n')}`] : []),
  ].join('\n\n');
}
```
  주의: 순서 배열의 `'## 출발 순위\n건수 × …정해요.'` 다음 줄은 빈 줄 뒤 목록이다 — 테스트는 각 조각을 따로 찾으므로 맞는다.

- [ ] **Step 4: 설명 문구** — `src/lib/tools/voc/index.ts`의 `description`을 아래로, 그리고 `inputLabel: '고객 의견',` 줄을 `description` 아래에 추가 (타입은 Task 3에서 생긴다 → **이 줄은 Task 3에서 넣는다**. 여기선 description만)

```ts
  description: 'VOC를 한 줄에 하나씩 붙여넣으면 주제로 묶고 건수 × 심각도로 출발 순위를 매겨요. 최종 우선순위는 고객군 · 목표 · 비용을 보고 직접 정해요.',
```

- [ ] **Step 5: 통과 확인** — `npx vitest run src/lib/tools/voc` → PASS. 다른 테스트가 옛 문구(`점수 8` · `1위`)를 찾으면 `grep -rn "1위\|점수 " src --include=*.test.ts`로 찾아 새 형식에 맞춘다

- [ ] **Step 6: 커밋**
```bash
git add src/lib/tools/voc
git commit -m "feat(tools): VOC 결과를 출발 순위 + 볼 질문으로 (#41)"
```

---

### Task 2: 협상 결과 본문 — 다음 요청을 맨 끝, 참고 점수

**Files:** Modify `src/lib/tools/negotiation/compute.ts` (`renderNegotiation`), `negotiation.test.ts` (`describe('renderNegotiation')`), `src/lib/tools/negotiation/index.ts` (description)

**Interfaces:** `renderNegotiation(r: NegotiationResult): string` 그대로. 독립.

- [ ] **Step 1: 테스트 바꾸기** — `renderNegotiation`의 두 `it`을 아래로

```ts
  it('1라운드: 상대 → 상대 요청(맨 끝), 점수 칸 없음', () => {
    const md = renderNegotiation(round1());
    expect(md.indexOf('## 상대\n- 역할: 영업 본부장')).toBe(0);
    expect(md).toContain('## 상대 요청\n엑셀 내보내기를 넣어 주세요.');
    expect(md.trimEnd().endsWith("아래에 내 답을 적고 '내 답 보내기'를 눌러 주세요.")).toBe(true);
    expect(md).not.toContain('점수');
    expect(md).not.toContain('## 지난 대화');
  });
  it('다음 라운드: 내 답 → 상대 반응 → 피드백 → 참고 점수 → 지난 대화 → 다음 요청(맨 끝)', () => {
    const r2 = computeNegotiation(scored([2, 2, 2, 2, 2]), { answer: '첫 답' }, round1());
    const r3 = computeNegotiation(scored([3, 3, 3, 3]), { answer: '둘째\n답' }, r2);
    const md = renderNegotiation(r3);
    const order = [
      '## 상대',
      '## 3라운드 내 답\n> 둘째\n> 답',
      '## 상대 반응',
      '## 피드백',
      '## 참고 점수 · 15 / 25 (응답 없음 1개 빼고 환산) (이전 10 → +5)',
      '- 세션 평균 12.5 / 25',
      '- 공감 3 — 이유 (이전 2 → +1)',
      '- 명확성 응답 없음',
      '## 지난 대화',
      '### 1라운드\n- 상대 요청: 엑셀',
      '### 2라운드 · 10 / 25\n- 내 답: 첫 답',
      '## 다음 요청',
    ];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
    expect(md).not.toContain('## 점수');
  });
```

- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/tools/negotiation/negotiation.test.ts` → FAIL

- [ ] **Step 3: `renderNegotiation` 바꾸기** (`totalText` · `quote` · `signed`는 그대로)

```ts
export function renderNegotiation(r: NegotiationResult) {
  const now = r.rounds.at(-1)!;
  const before = r.rounds.at(-2);
  const p = r.persona;
  const parts = [`## 상대\n` + (p ? `- 역할: ${p.role}\n- 목표: ${p.goal}\n- 압박: ${p.pressure}` : '- 응답 없음')];
  if (now.round > 1) {
    parts.push(
      `## ${now.round}라운드 내 답\n${quote(now.answer ?? '')}`,
      `## 상대 반응\n${now.reaction ?? '응답 없음'}`,
      `## 피드백\n${now.feedback ?? '응답 없음'}`,
      // 점수는 판단 대신이 아니라 참고 (피드백 8) — 반응 · 피드백 뒤에 둔다
      `## 참고 점수 · ${totalText(now)}${r.delta !== null && before ? ` (이전 ${before.total} → ${signed(r.delta)})` : ''}\n` +
        `- 세션 평균 ${r.average === null ? '응답 없음' : `${r.average} / ${MAX_TOTAL}`}\n` +
        CRITERIA.map((c) => {
          const s = now.scores?.[c];
          const d = r.criteriaDelta?.[c];
          return s ? `- ${c} ${s.score} — ${s.reason}${d != null ? ` (이전 ${before?.scores?.[c]?.score} → ${signed(d)})` : ''}` : `- ${c} 응답 없음`;
        }).join('\n'),
    );
  }
  if (r.rounds.length > 1) {
    parts.push(
      `## 지난 대화\n` +
        r.rounds
          .slice(0, -1)
          .map(
            (t) =>
              `### ${t.round}라운드${t.round > 1 ? ` · ${totalText(t)}` : ''}\n` +
              (t.answer ? `- 내 답: ${t.answer.replace(/\s*\n\s*/g, ' ')}\n- 상대 반응: ${t.reaction ?? '응답 없음'}\n` : '') +
              `- 상대 요청: ${t.request}`,
          )
          .join('\n\n'),
    );
  }
  // 요청이 맨 끝 — 결과 바로 아래 '내 답' 칸과 붙는다
  parts.push(`## ${now.round === 1 ? '상대 요청' : '다음 요청'}\n${now.request}\n\n아래에 내 답을 적고 '내 답 보내기'를 눌러 주세요.`);
  return parts.join('\n\n');
}
```

- [ ] **Step 4: 설명 문구** — `src/lib/tools/negotiation/index.ts`

```ts
  description: '문서와 부딪히는 요청을 하는 이해관계자와 라운드마다 협상을 연습해요. 상대 반응과 피드백을 보고 답을 다듬어요. 점수는 참고로만 보여 줘요.',
```
  `validate`의 1라운드 안내 `"…상대 요청을 받은 뒤 '내 답 보내기'를 눌러 주세요."`는 그대로 맞다.

- [ ] **Step 5: 통과 확인** — `npx vitest run src/lib/tools/negotiation` → PASS (옛 문구를 찾는 다른 테스트가 있으면 새 형식으로)

- [ ] **Step 6: 커밋**
```bash
git add src/lib/tools/negotiation
git commit -m "feat(tools): 협상 결과는 요청을 맨 끝 · 점수는 참고로 (#41)"
```

---

### Task 3: 공통 틀 — 입력 먼저 · 기본 문서 없이 · 결과 안 이어 실행 입력, 협상 답 칸 옮기기

**Files:** Modify `src/lib/tools/types.ts`, `src/lib/tools/voc/index.ts`, `src/app/tools/_frame/load.ts`, `src/app/tools/_frame/tool-frame.tsx`, `src/app/tools/negotiation/page.tsx`, `src/app/tools/negotiation/inputs.tsx`

**Interfaces:**
- `ToolDef.inputLabel?: string` — 도구 입력 칸 제목, 기본 '도구 입력'
- `ToolFrameData.tool.inputLabel: string`
- `ToolFrame` props: `continueFields?: React.ReactNode` — 결과 상자 안, 본문 아래 · 이어 실행 버튼 위. 데모면 보이지 않음
- URL: `sourceOptional` 도구는 `?source=pasted`가 붙여넣기, 파라미터 없음이 문서 없이. 다른 도구는 지금 그대로(없음 = 붙여넣기)

- [ ] **Step 1: 타입 · VOC 정의**
  `types.ts` `ToolDef`에 `runningLabel` 줄 아래:
```ts
  inputLabel?: string; // 도구 입력 칸 제목. 기본 '도구 입력'
```
  `sourceOptional` 주석 끝에 ` · 입력 칸이 문서 칸보다 위, 처음 고른 값은 '문서 없이' (성질이 갈리는 도구가 생기면 플래그를 나눈다)` 덧붙임.
  `voc/index.ts` description 아래 `inputLabel: '고객 의견',`

- [ ] **Step 2: `load.ts`**
  - `ToolFrameData.tool`에 `inputLabel: string;` 추가, 반환에 `inputLabel: tool.inputLabel ?? '도구 입력',`
  - `none` 계산을 바꾼다:
```ts
  // 문서 없이 실행하는 도구는 '문서 없이'가 기본, 붙여넣기는 ?source=pasted (spec §2)
  const none = ideaId === null && tool.sourceOptional === true && source !== 'pasted';
```
  - `none` 필드 주석을 "아이디어가 없고 sourceOptional이면 기본 true, ?source=pasted면 false"로

- [ ] **Step 3: `tool-frame.tsx`**
  1. Props에 `continueFields?: React.ReactNode;` (주석: `결과 상자 안 이어 실행 입력 (협상 내 답). 이어 실행 버튼과 같은 조건에서 보인다`) 추가하고 구조 분해에 넣는다
  2. `hrefOf`: 아이디어가 없을 때
```ts
    if (idea) q.set('idea', idea);
    else if (mode === 'none') {
      if (!tool.sourceOptional) q.set('source', 'none');
    } else if (tool.sourceOptional) q.set('source', 'pasted');
```
     (sourceOptional이 아닌 도구는 'none' 모드가 없으므로 실질적으로 지금과 같다)
  3. `changeMode`:
```ts
    if (next === 'none' && urlMode !== 'none') router.push(base);
    if (next === 'pasted' && urlMode !== 'pasted') router.push(tool.sourceOptional ? `${base}?source=pasted` : base);
```
     `'none'` 모드는 sourceOptional 도구에만 있으므로 `base`가 곧 문서 없이다.
  4. 문서 칸 `<section>`과 도구 입력 칸 `<section>`을 각각 변수로 뽑아 순서를 정한다:
```tsx
  const sourceSection = (
    <section>
      {sectionTitle(tool.sourceOptional ? '제품 맥락 (선택)' : '입력 문서')}
      {/* 기존 FlexBox(SegmentedControl · Select · TextArea …) 그대로 */}
    </section>
  );
  const inputSection = inputFields && (
    <section>
      {sectionTitle(tool.inputLabel)}
      {/* 기존 fieldset 그대로 */}
    </section>
  );
```
     JSX에서 `{tool.sourceOptional ? <>{inputSection}{sourceSection}</> : <>{sourceSection}{inputSection}</>}` (입력이 주인공인 도구는 입력 먼저 — 주석 한 줄)
  5. 결과 상자 안: 기존 `{tool.continueLabel && !demo && ( <FlexBox justifyContent="flex-end" …>버튼</FlexBox> )}`를
```tsx
                {tool.continueLabel && !demo && (
                  <FlexBox flexDirection="column" gap="12px" sx={{ marginTop: '12px' }}>
                    {continueFields && (
                      <fieldset disabled={blocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                        {continueFields}
                      </fieldset>
                    )}
                    <FlexBox justifyContent="flex-end">
                      {/* 기존 이어 실행 Button 그대로 */}
                    </FlexBox>
                  </FlexBox>
                )}
```

- [ ] **Step 4: 협상 페이지 · 입력**
  `negotiation/page.tsx`: `inputFields=…` 대신
```tsx
      continueFields={data.current ? <NegotiationInputs resultId={data.current.id} maxChars={MAX_ANSWER_CHARS} /> : undefined}
```
  `negotiation/inputs.tsx`: `resultId: string`(null 없음)으로, 주석 "내 답 칸. 결과 상자 안에 놓인다 — 새 라운드 결과로 바뀌면 비운다", placeholder `'상대 요청에 대한 내 답을 적어 주세요.'`, 안내 줄 `최대 {N}자 · {n}자`(“새 협상은 비워 두고…” 문구 삭제), `aria-label="내 답"` 유지.

- [ ] **Step 5: 검사** — `npm run lint && npm run typecheck && npm test && npm run build` 모두 통과

- [ ] **Step 6: 커밋**
```bash
git add src/lib/tools/types.ts src/lib/tools/voc/index.ts src/app/tools
git commit -m "feat(tools): VOC는 고객 의견 먼저 · 협상 내 답은 결과 안에서 (#41)"
```

---

### Task 4: 데모 결과 본문 다시 만들기 · 화면 확인 · why · PR

**Files:** Modify `demo-data/ideas/20261028-1441-n9rp/tools/voc-20261028T092554-ba66.md`, `negotiation-20261028T092711-2bd4.md`, `negotiation-20261028T092812-05bb.md` (본문만) · Create `docs/decisions/2026-10-29_도구-입력-순서.md` · Modify `docs/decisions/README.md`

- [ ] **Step 1: 본문 다시 만들기** — 일회성 스크립트를 git이 무시하는 곳(`.superpowers/sdd/2026-10-29-tool-input-order/rerender.ts`)에 두고 `npx vite-node -c vitest.config.ts <그 경로>`로 실행. 머리말은 gray-matter로 읽어 그대로 다시 쓰고 `body`만 `render(data)`로:
```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { renderNegotiation } from '@/lib/tools/negotiation/compute';
import { renderVoc } from '@/lib/tools/voc/compute';

const dir = path.resolve('demo-data/ideas/20261028-1441-n9rp/tools');
for (const f of await fs.readdir(dir)) {
  const render = f.startsWith('voc-') ? renderVoc : f.startsWith('negotiation-') ? renderNegotiation : null;
  if (!render) continue;
  const raw = await fs.readFile(path.join(dir, f), 'utf8');
  const { data: front } = matter(raw);
  const body = render(JSON.parse(front.data as string));
  await fs.writeFile(path.join(dir, f), matter.stringify('', front) + '\n' + body.trim() + '\n');
  console.log('rerendered', f);
}
```
  `git diff --stat demo-data`로 세 파일만 바뀌었는지, `git diff demo-data | grep '^[-+]data'`가 비었는지(데이터 줄 내용 불변) 확인. 머리말 접힘 모양만 바뀌었으면 괜찮다 — `getToolResult`로 읽히는지는 Step 2 화면에서 확인

- [ ] **Step 2: 화면 확인**
  - 일반 모드(임시 데이터 폴더 dev): `/tools/voc` → 칸 순서(고객 의견 → 제품 맥락 (선택)) · 기본 "문서 없이" · "직접 붙여넣기" → URL `?source=pasted` · 뒤로 가기 시 문서 없이로 · `/tools/voc?idea=<id>` → 아이디어 탭 · 기획안
  - `/tools/negotiation` 결과 없을 때: 도구 입력 칸 없음. 결과 있을 때: 결과 상자 안 내 답 칸 + "내 답 보내기"
  - `/tools/prd-review` · `/tools/metrics`: 칸 순서 · 붙여넣기 기본 지금과 같음
  - 데모(prod build, `hatch-demo`): VOC 샘플 결과가 새 형식(출발 순위 · 볼 것), 협상 결과 요청이 맨 끝 · 참고 점수, 답 칸 없음. 콘솔(기존 #418 제외)

- [ ] **Step 3: why 기록** — `docs/decisions/2026-10-29_도구-입력-순서.md` (What: VOC는 고객 의견부터 · 협상 답은 요청 바로 아래 · 점수는 출발점/참고 / Why: 피드백 5 · 8 — 실제 작업 순서와 화면 순서가 달랐고, 점수가 사람의 판단을 앞질렀다 / 판단 근거: 사람이 고른 순위 저장은 4a로, 지금은 볼 질문만) + README 표 한 줄. 실수 · 프롬프트 변경이 있었으면 `docs/ai-usage/`도

- [ ] **Step 4: 전체 검증 · 커밋 · PR**
```bash
npm run lint && npm run typecheck && npm test && npm run build
git add demo-data docs/decisions docs/plans/2026-10-29-tool-input-order.md
git commit -m "docs(tools): 도구 입력 순서 why · 데모 결과 새 형식 (#41)"
git push -u origin feat/41-tool-input-order
gh pr create --title "feat(tools): VOC 의견 먼저 · 협상 답은 1라운드 뒤 · 점수 낮추기 (#41)" --body-file <템플릿 채운 파일>
```
  머지는 사용자 승인 후 squash.
