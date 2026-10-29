# 구조화 (폴더 묶음 · 저장 정리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이디어를 폴더 하나에 묶어 칩으로 보이게 하고(#54), 생성 문서를 `docs/`로 모으고 자동 목록 파일을 쓴다(#55).

**Architecture:** 폴더는 idea.md 머리말 `folder` 한 칸. 폴더 목록 · 걸러내기는 storage의 순수 함수(`folders.ts`)가 계산하고 페이지가 props로 넘긴다. 문서 경로는 `docs.ts`의 경로 함수 하나만 바꿔 `docs/` 우선 · 예전 자리 대체 읽기를 한다. 목록 파일은 아이디어 쓰기 함수 끝에서 다시 쓴다.

**Tech Stack:** Next.js 16 App Router · React 19 · Montage UI(`Chip` · `ContentBadge` · `TextField`) · gray-matter · vitest

spec: [docs/specs/2026-10-29-structure-design.md](../specs/2026-10-29-structure-design.md)

## Global Constraints
- 화면 문구에 가운데 점(·)을 쓰지 않는다 (#52). 커밋 · PR · 화면 문구는 한국어
- 폴더 이름: 앞뒤 공백 정리 · 안쪽 연속 공백 하나로 · 최대 30자(`FOLDER_MAX = 30`, 넘으면 `StorageError('폴더 이름은 30자까지예요.')`) · `미분류`(`UNFILED`)는 빈 값으로 본다
- `Idea.folder: string`, 빈 문자열 = 미분류. `IDEA_FILE_VERSION` 2 → 3, 2판 이하는 `folder: ''`로 읽는다
- 칩 줄 순서: `전체 N` → 폴더 이름 가나다순(`localeCompare(b, 'ko')`) → 미분류가 있으면 맨 끝 `미분류 N`. 폴더가 하나도 없으면 칩 줄을 숨긴다
- 고른 폴더는 주소 `?folder=이름` (미분류 `?folder=미분류`, 전체는 파라미터 없음). 없는 이름이면 전체
- 화면 컴포넌트는 `@/lib/storage`를 값으로 import하지 않는다 (type import만). 값은 페이지가 props로
- storage는 파일을 지우지 않는다 (이동만). 덮어쓰기 전 이전 판은 `keepHistory`(이미 `.history/`로 **옮긴다**)
- 생성 문서 자리: `ideas/<id>/docs/<file>`. 읽기는 `docs/` → 없으면 `ideas/<id>/<file>`. 쓰기는 항상 `docs/`
- 목록 파일: `$HATCH_DATA_DIR/목록.md`. 첫 줄 `# Hatch 아이디어 목록`, 둘째 줄 `자동으로 만든 파일이에요. 고쳐도 다음 저장 때 다시 쓰여요.`, 폴더별 `## 이름`(미분류 맨 끝), 줄은 `- [제목](ideas/<id>/idea.md) — 메모 첫 줄 40자`. 폴더 안은 `updatedAt` 최근순. 쓰기 실패는 저장을 막지 않는다
- 커밋 `<type>(bank): 내용 (#이슈)` + 마지막 줄 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 검증: `npm run lint && npm run typecheck && npm test && npm run build`

## 스펙과 다르게 정한 것 (구현 세부)
- (spec도 이렇게 고침) 카드의 폴더 칩은 **누를 수 없는 배지**로 둔다. 카드 전체가 링크(`Card as={Link}`)라 안에 링크를 넣으면 `<a>` 안 `<a>`가 되어 화면 복원 오류가 난다 (mistakes #16과 같은 종류). 걸러내기는 칩 줄로 한다
- (spec도 이렇게 고침) 예전 자리 파일을 따로 `docs/`로 옮기는 단계는 없다. 쓰기 전 `keepHistory`가 지금 있는 파일(예전 자리든 `docs/`든)을 `.history/`로 옮기므로 예전 자리에 남는 파일이 없다
- 데모에서 목록 파일을 안 쓰는 건 따로 검사하지 않는다. 데모의 Server Action은 쓰기 전에 `DEMO_MESSAGE`로 돌아가므로 쓰기 함수에 닿지 않는다

---

# Part 1 — 폴더 묶음 · 칩 화면 (#54)

브랜치 `feat/54-idea-folders` (spec 커밋 a99abd6 위)

### Task 1: 폴더 저장 · 계산

**Files:**
- Modify: `src/lib/storage/types.ts` · `src/lib/storage/ideas.ts` · `src/lib/storage/index.ts` · `src/lib/storage/CLAUDE.md`
- Create: `src/lib/storage/folders.ts` · `src/lib/storage/folders.test.ts`
- Test: `src/lib/storage/ideas.test.ts`

**Interfaces:**
- Produces:
  - `Idea.folder: string`
  - `createIdea(input: { title: string; memo: string; folder?: string })` · `updateIdea(id, patch: { title?: string; memo?: string; folder?: string })`
  - `folders.ts`: `FOLDER_MAX = 30` · `UNFILED = '미분류'` · `type FolderCount = { name: string; count: number }` (name `''` = 미분류) · `groupFolders(ideas: ReadonlyArray<{ folder: string }>): FolderCount[]` · `pickFolder(folders: FolderCount[], raw: string | undefined): string | null` (null = 전체, `''` = 미분류) · `folderNames(folders: FolderCount[]): string[]` (미분류 빼고 이름만)
  - `index.ts`에서 위 모두 export

- [ ] **Step 1: 실패하는 테스트**

`src/lib/storage/folders.test.ts`:
```ts
import { describe, expect, it } from 'vitest';

import { folderNames, groupFolders, pickFolder, UNFILED } from './folders';

const f = (...names: string[]) => names.map((folder) => ({ folder }));

describe('groupFolders', () => {
  it('폴더별 수, 가나다순, 미분류는 맨 끝', () => {
    expect(groupFolders(f('회의', '', '취미', '회의'))).toEqual([
      { name: '취미', count: 1 },
      { name: '회의', count: 2 },
      { name: '', count: 1 },
    ]);
  });
  it('전부 미분류면 빈 목록 (칩 줄을 숨긴다)', () => {
    expect(groupFolders(f('', ''))).toEqual([]);
  });
});

describe('pickFolder', () => {
  const folders = groupFolders(f('취미', ''));
  it('있는 이름은 그대로, 미분류는 빈 문자열', () => {
    expect(pickFolder(folders, '취미')).toBe('취미');
    expect(pickFolder(folders, UNFILED)).toBe('');
  });
  it('없거나 모르는 이름은 전체(null)', () => {
    expect(pickFolder(folders, undefined)).toBeNull();
    expect(pickFolder(folders, '없는 폴더')).toBeNull();
    expect(pickFolder(groupFolders(f('취미')), UNFILED)).toBeNull();
  });
});

describe('folderNames', () => {
  it('미분류를 뺀 이름만', () => {
    expect(folderNames(groupFolders(f('회의', '', '취미')))).toEqual(['취미', '회의']);
  });
});
```

`src/lib/storage/ideas.test.ts` 끝에 추가 (import에 `UNFILED` 더하기):
```ts
describe('폴더', () => {
  it('새 아이디어는 미분류, 폴더를 정하면 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(idea.folder).toBe('');
    await updateIdea(idea.id, { folder: '  퇴근 후   취미 ' });
    expect((await getIdea(idea.id))!.folder).toBe('퇴근 후 취미');
  });

  it('만들 때 폴더를 정할 수 있고, 미분류는 빈 값', async () => {
    expect((await createIdea({ title: 'a', memo: '', folder: '회의' })).folder).toBe('회의');
    expect((await createIdea({ title: 'b', memo: '', folder: UNFILED })).folder).toBe('');
  });

  it('30자 넘는 이름은 거부', async () => {
    await expect(createIdea({ title: 'x', memo: '', folder: '가'.repeat(31) })).rejects.toThrow(StorageError);
  });

  it('2판 idea.md(folder 없음)는 미분류로 읽는다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'idea.md');
    await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace(/^folder:.*\n/m, '').replace('version: 3', 'version: 2'));
    expect((await getIdea(idea.id))!.folder).toBe('');
  });

  it('폴더를 안 넘기고 고치면 폴더는 그대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '', folder: '회의' });
    await updateIdea(idea.id, { title: 'y' });
    expect((await getIdea(idea.id))!.folder).toBe('회의');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/storage/folders.test.ts src/lib/storage/ideas.test.ts`
Expected: FAIL — `./folders` 없음, `folder` 속성 없음

- [ ] **Step 3: 구현**

`src/lib/storage/folders.ts` (순수 함수, `server-only` 아님):
```ts
/** 아이디어 폴더 (묶음). 폴더 목록은 따로 저장하지 않고 아이디어들의 folder에서 모은다 */
export const FOLDER_MAX = 30;
/** 빈 폴더의 화면 이름이자 예약어 (이 이름으로 저장하면 빈 값) */
export const UNFILED = '미분류';

/** name '' = 미분류 */
export type FolderCount = { name: string; count: number };

/** 폴더별 수. 이름 가나다순, 미분류는 맨 끝. 폴더가 하나도 없으면 [] */
export function groupFolders(ideas: ReadonlyArray<{ folder: string }>): FolderCount[] {
  const counts = new Map<string, number>();
  for (const { folder } of ideas) counts.set(folder, (counts.get(folder) ?? 0) + 1);
  const named = [...counts].filter(([name]) => name !== '').sort(([a], [b]) => a.localeCompare(b, 'ko'));
  if (named.length === 0) return [];
  const unfiled = counts.get('');
  return [...named.map(([name, count]) => ({ name, count })), ...(unfiled ? [{ name: '', count: unfiled }] : [])];
}

/** 주소 ?folder= 값 → 고른 폴더. null = 전체, '' = 미분류. 목록에 없는 이름은 전체 */
export function pickFolder(folders: FolderCount[], raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const name = raw === UNFILED ? '' : raw;
  return folders.some((f) => f.name === name) ? name : null;
}

export const folderNames = (folders: FolderCount[]) => folders.filter((f) => f.name !== '').map((f) => f.name);
```

`src/lib/storage/types.ts`
- `Idea`에 `context` 아래 추가: `/** 폴더(묶음) 이름. '' = 미분류 */ folder: string;`
- 버전 주석과 값: `// 2: context 머리말 추가 (1판은 빈 맥락으로 읽음)` 아래에 `// 3: folder 머리말 추가 (2판 이하는 미분류로 읽음)`, `export const IDEA_FILE_VERSION = 3;`

`src/lib/storage/ideas.ts`
- import에 `import { FOLDER_MAX, UNFILED } from './folders';`
- `cleanTitle` 아래:
```ts
function cleanFolder(folder: string) {
  const f = folder.trim().replace(/\s+/g, ' ');
  if (f.length > FOLDER_MAX) throw new StorageError('폴더 이름은 30자까지예요.');
  return f === UNFILED ? '' : f;
}
```
- `readIdea` 반환에 `folder: typeof data.folder === 'string' ? data.folder : ''` 추가
- `createIdea(input: { title: string; memo: string; folder?: string })` — `idea` 객체에 `folder: cleanFolder(input.folder ?? '')` 추가
- `updateIdea(id, patch: { title?: string; memo?: string; folder?: string })` — `next`에 `folder: patch.folder === undefined ? current.folder : cleanFolder(patch.folder),` 추가

`src/lib/storage/index.ts` — `export { FOLDER_MAX, UNFILED, folderNames, groupFolders, pickFolder, type FolderCount } from './folders';`

`src/lib/storage/CLAUDE.md`
- 파일 지도에 `` · `folders.ts` — 폴더 묶음 계산 (순수) `` 추가
- 저장 형식 첫 줄 `머리말 \`context\` = 맥락 4칸 · 2판`을 `머리말 \`context\` = 맥락 4칸 · \`folder\` = 폴더 이름(빈 값 = 미분류) · 3판`으로

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/storage && npm run typecheck`
Expected: storage 테스트 PASS. typecheck가 `Idea`를 만드는 다른 곳에서 `folder` 누락으로 실패하면 그 자리에 `folder: ''`를 넣는다 (테스트 픽스처 포함)

- [ ] **Step 5: 커밋**
```bash
git add src/lib/storage
git commit -m "feat(bank): 아이디어 폴더 저장 · 폴더 계산 (#54)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: 폼에서 폴더 정하기 · 상세 제목 옆 칩

**Files:**
- Modify: `src/app/actions.ts` · `src/app/_components/idea-form.tsx` · `src/app/page.tsx` · `src/app/ideas/[id]/page.tsx` · `src/app/ideas/[id]/idea-detail.tsx`

**Interfaces:**
- Consumes: `groupFolders` · `folderNames` (`@/lib/storage`, 페이지에서만) · `Idea.folder`
- Produces: `FormState.values: { title: string; memo: string; folder: string }` · `IdeaForm`에 prop `folders: string[]`, `initial?: { title: string; memo: string; folder: string }` · `IdeaDetail`의 `idea` prop에 `folder`, 새 prop `folders: string[]`

- [ ] **Step 1: Server Action**

`src/app/actions.ts`
- `FormState.values` 타입을 `{ title: string; memo: string; folder: string }`로
- `readForm`에 `folder: String(formData.get('folder') ?? ''),` 추가 (`createIdea(values)` · `updateIdea(id, values)`는 그대로 folder까지 넘긴다)

- [ ] **Step 2: 폼**

`src/app/_components/idea-form.tsx`
- import에 `useState` 추가, Montage에서 `Chip` 추가
- Props: `initial?: { title: string; memo: string; folder: string };` · `/** 지금 있는 폴더 이름 (누르면 칸이 채워진다) */ folders: string[];`
- 함수 인자에 `folders`. 폴더 칸은 칩을 누르면 채워져야 해서 상태가 필요하다. `IdeaForm` 안에 상태를 두면 `<form key=…>`가 바뀌어도 초기화되지 않으므로, 같은 파일에 작은 컴포넌트로 빼서 form 안에 둔다 (key가 바뀔 때 같이 다시 그려진다):
```tsx
function FolderField({ initial, folders, disabled }: { initial: string; folders: string[]; disabled: boolean }) {
  const [folder, setFolder] = useState(initial);
  return (
    <FlexBox flexDirection="column" gap="8px">
      <TextField
        name="folder"
        placeholder="폴더 (선택, 비우면 미분류)"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
        aria-label="폴더"
        disabled={disabled}
      />
      {folders.length > 0 && !disabled && (
        <FlexBox gap="6px" sx={{ flexWrap: 'wrap' }}>
          {folders.map((name) => (
            <Chip key={name} type="button" size="small" variant="outlined" active={folder === name} onClick={() => setFolder(name)}>
              {name}
            </Chip>
          ))}
        </FlexBox>
      )}
    </FlexBox>
  );
}
```
  메모 `TextArea` 아래에 `<FolderField initial={values?.folder ?? ''} folders={folders} disabled={demo} />` — `<form key={state.savedAt ?? 0}>` 안이라 저장할 때마다 다시 그려진다

`src/app/page.tsx` (홈)
- import에 `folderNames, groupFolders` (`@/lib/storage`)
- `const { items } = await listIdeasWithProgress();` 아래 `const folders = folderNames(groupFolders(items.map((i) => i.idea)));`
- `<IdeaForm … folders={folders} />`

- [ ] **Step 3: 상세**

`src/app/ideas/[id]/page.tsx`
- import에 `folderNames, groupFolders, listIdeas` (`@/lib/storage`)
- `Promise.all`에 `listIdeas().catch(() => ({ ideas: [], unreadable: 0 }))`를 더해 `all`로 받고, `const folders = folderNames(groupFolders(all.ideas));`
- `idea={{ title: idea.title, memo: idea.memo, folder: idea.folder }}` · `folders={folders}` 넘기기

`src/app/ideas/[id]/idea-detail.tsx`
- Props `idea: { title: string; memo: string; folder: string }` · `folders: string[]` 추가, 인자에도
- Montage import에 `ContentBadge`
- 제목 줄(수정 아닐 때) `PageHeader`를 감싸:
```tsx
          <Box>
            {idea.folder && (
              <ContentBadge size="xsmall" variant="outlined" color="neutral" sx={{ marginBottom: '8px' }}>
                {idea.folder}
              </ContentBadge>
            )}
            <PageHeader title={idea.title} description={idea.memo || undefined} />
          </Box>
```
- `<IdeaForm … initial={idea} folders={folders} …/>`

- [ ] **Step 4: 검사**

Run: `npm run lint && npm run typecheck && npm test`
Expected: 모두 통과

- [ ] **Step 5: 커밋**
```bash
git add src/app/actions.ts src/app/_components/idea-form.tsx src/app/page.tsx "src/app/ideas/[id]/page.tsx" "src/app/ideas/[id]/idea-detail.tsx"
git commit -m "feat(bank): 아이디어 폼에서 폴더 정하기 (#54)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: 모음 화면 칩 줄 · 카드 배지

**Files:**
- Create: `src/app/_components/folder-chips.tsx`
- Modify: `src/app/ideas/page.tsx` · `src/app/_components/idea-card.tsx` · `src/app/_components/to-card.ts`

**Interfaces:**
- Consumes: `groupFolders` · `pickFolder` · `UNFILED` · `type FolderCount` (페이지는 값, 컴포넌트는 type만)
- Produces: `IdeaCardData.folder: string` · `FolderChips({ folders: FolderCount[]; total: number; selected: string | null })`

- [ ] **Step 1: 카드**

`src/app/_components/to-card.ts` — 반환에 `folder: idea.folder,`
`src/app/_components/idea-card.tsx`
- `IdeaCardData`에 `/** '' = 미분류 (배지 없음) */ folder: string;`
- 인자에 `folder`, 배지 줄을:
```tsx
        <CardRow variant="badge" position="top">
          <FlexBox gap="4px">
            <ContentBadge size="xsmall" color={progress === '아이디어' ? 'neutral' : 'accent'}>
              {progress}
            </ContentBadge>
            {folder && (
              <ContentBadge size="xsmall" variant="outlined" color="neutral">
                {folder}
              </ContentBadge>
            )}
          </FlexBox>
        </CardRow>
```
  (Montage import에 `FlexBox`. 카드 전체가 링크라 배지는 누를 수 없다 — 계획 "스펙과 다르게 정한 것")

- [ ] **Step 2: 칩 줄**

`src/app/_components/folder-chips.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { Chip, FlexBox } from '@montage-ui/core';

import type { FolderCount } from '@/lib/storage';

// 미분류 화면 이름 · 주소 값 (storage UNFILED와 같은 값. 화면은 storage 값을 import하지 않는다)
const UNFILED = '미분류';

type Props = { folders: FolderCount[]; total: number; selected: string | null };

/** 모음 화면 위 폴더 칩 줄. 폴더가 없으면 그리지 않는다 */
export default function FolderChips({ folders, total, selected }: Props) {
  if (folders.length === 0) return null;
  const chip = (label: string, count: number, href: string, active: boolean) => (
    <Chip key={href} as={Link} href={href} size="small" variant="outlined" active={active} scroll={false}>
      {label} {count}
    </Chip>
  );
  return (
    <FlexBox gap="6px" sx={{ flexWrap: 'wrap', marginBottom: '16px' }}>
      {chip('전체', total, '/ideas', selected === null)}
      {folders.map((f) => {
        const label = f.name || UNFILED;
        return chip(label, f.count, `/ideas?folder=${encodeURIComponent(label)}`, selected === f.name);
      })}
    </FlexBox>
  );
}
```

- [ ] **Step 3: 모음 페이지**

`src/app/ideas/page.tsx`:
```tsx
import { connection } from 'next/server';

import { groupFolders, listIdeasWithProgress, pickFolder } from '@/lib/storage';

import FolderChips from '../_components/folder-chips';
import IdeaList from '../_components/idea-list';
import PageHeader from '../_components/page-header';
import { toCard } from '../_components/to-card';

// 로컬 전용 · 항상 요청 시 렌더라 정적 셸 검증을 끈다 (docs: route-segment-config/instant, 'Disabling instant')
export const instant = false;

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  await connection();
  const [{ items, unreadable }, { folder }] = await Promise.all([listIdeasWithProgress(), searchParams]);
  const folders = groupFolders(items.map((i) => i.idea));
  const selected = pickFolder(folders, folder);
  const shown = selected === null ? items : items.filter((i) => i.idea.folder === selected);

  return (
    <>
      <PageHeader title="아이디어 모음" description={`${items.length}개, 누르면 기획안으로 이어져요.`} />
      <FolderChips folders={folders} total={items.length} selected={selected} />
      <IdeaList cards={shown.map(toCard)} unreadable={unreadable} emptyAction />
    </>
  );
}
```
(설명 문구는 #53이 바꾼 지금 문구 그대로. Next 16 `searchParams`는 Promise — `src/app/tools/metrics/page.tsx`와 같은 모양)

- [ ] **Step 4: 검사**

Run: `npm run lint && npm run typecheck && npm test`
Expected: 모두 통과. `Chip`이 `as={Link}`에서 `href` · `scroll` 타입 오류를 내면 `Chip`을 `<Link href=… scroll={false} style={{ textDecoration: 'none' }}>`로 감싸고 `Chip`은 `as="span"`으로 둔다

- [ ] **Step 5: 커밋**
```bash
git add src/app/_components/folder-chips.tsx src/app/_components/idea-card.tsx src/app/_components/to-card.ts src/app/ideas/page.tsx
git commit -m "feat(bank): 아이디어 모음 폴더 칩 줄 · 카드 폴더 배지 (#54)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: 데모 폴더 · 화면 확인 · 기록 (Part 1 마무리)

**Files:**
- Modify: `demo-data/ideas/20261028-1441-n9rp/idea.md` · `demo-data/ideas/20261028-1828-83bl/idea.md` · `demo-data/ideas/20261028-1828-auxd/idea.md` · `docs/decisions/README.md` · `src/app/CLAUDE.md`
- Create: `docs/decisions/2026-10-29_폴더-묶음.md`

- [ ] **Step 1: 데모 폴더**

세 idea.md 머리말에 `folder`를 넣고 `version: 3`으로:
- `20261028-1441-n9rp` (동네 원데이 클래스 추천) → `folder: 일상 추천`
- `20261028-1828-83bl` · `20261028-1828-auxd` → 각 제목을 읽고 업무 쪽이면 `folder: 업무 도구`, 아니면 `일상 추천`. 둘 다 같은 폴더면 하나는 비워 미분류도 보이게 한다
- 폴더는 기획안 입력(`ideaSource`: 제목 · 메모 · 맥락)에 들어가지 않으므로 문서 stale은 바뀌지 않는다 — 데모 상세에서 "오래됨"이 새로 뜨지 않는지 Step 2에서 확인

- [ ] **Step 2: 화면 확인 (dev, 임시 데이터 `hatch-temp` 포트 3111)**

1. 홈: 폴더 칸에 `퇴근 후 취미` 적고 저장 → "방금 적은 아이디어" 카드에 배지
2. 홈 다시: 폴더 칸 아래 `퇴근 후 취미` 칩 → 누르면 칸이 채워짐
3. `/ideas`: 칩 줄 `전체 N`, `퇴근 후 취미 1`, `미분류 N` → `퇴근 후 취미` 누르면 그 카드만, 주소 `?folder=…`, 새로고침해도 유지, `미분류` 칩도 동작
4. 상세: 제목 위 배지 · 수정에서 폴더를 비우고 저장 → 배지 사라짐, 모음 칩 줄이 사라짐(폴더 0개)
5. `/ideas?folder=없는폴더` → 전체
6. 375px 폭에서 칩 줄이 줄바꿈되고 가로로 안 넘침
7. 콘솔 오류 없음 · 화면에 가운데 점 없음
8. dev를 끄고 `npm run build` 뒤 `hatch-demo`(포트 3110): 칩 줄 · 카드 배지 보임, 폼 폴더 칸은 비활성, 데모 상세에 "오래됨" 새로 없음, 콘솔은 기존 React #418 · `$RS`만

- [ ] **Step 3: why 기록**

`docs/decisions/2026-10-29_폴더-묶음.md`:
```markdown
# 아이디어를 폴더로 묶고 칩으로 고른다

**날짜**: 2026-10-29
**관련 파일**: folder-chips.tsx, idea-form.tsx, folders.ts

## What — 무엇이 달라졌나
아이디어마다 폴더를 하나 정할 수 있고, 아이디어 모음 위 칩을 눌러 그 폴더만 볼 수 있다. 카드와 상세 제목에 폴더가 보인다.

## Why — 왜 필요했나
아이디어가 늘면서 날짜순 한 줄 목록으로는 같은 주제끼리 모아 보기 어려웠다.

## 판단 근거
- 폴더는 하나만. 여러 개(태그)는 같은 아이디어가 여러 곳에 보여 오히려 헷갈린다. 고르는 건 칩으로 해 태그처럼 가볍게 쓴다.
- 폴더를 따로 만들고 지우는 화면은 두지 않는다. 아이디어를 고칠 때 이름을 적으면 생기고, 마지막 아이디어가 빠지면 사라진다.
- 아이디어 파일은 옮기지 않고 폴더 이름만 적는다. 폴더를 바꿔도 링크와 도구 결과가 그대로다.
```
`docs/decisions/README.md` 표 끝: `| 10-29 | [아이디어를 폴더로 묶고 칩으로 고른다](2026-10-29_폴더-묶음.md) |`

`src/app/CLAUDE.md` 파일 지도 `/ideas` 줄: `` `/ideas` 모음 `` → `` `/ideas` 모음(`?folder=` 폴더 칩) ``

- [ ] **Step 4: 전체 검증 · 커밋**

dev를 끄고 Run: `npm run lint && npm run typecheck && npm test && npm run build` → 모두 통과
```bash
git add demo-data/ideas/*/idea.md docs/decisions src/app/CLAUDE.md
git commit -m "docs(bank): 폴더 묶음 데모 샘플 · why 기록 (#54)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part 2 — 저장 정리 (#55)

Part 1 PR이 머지된 뒤 main에서 `feat/55-storage-tidy` 브랜치를 딴다. #49(데이터 구성 단계)가 먼저 머지됐으면 `DOC_STEPS`에 `data`가 있을 뿐 아래 작업은 같다.

### Task 5: 생성 문서를 `docs/`로

**Files:**
- Modify: `src/lib/storage/docs.ts` · `src/lib/storage/CLAUDE.md`
- Test: `src/lib/storage/docs.test.ts`

**Interfaces:**
- Produces: 없음 (`getDocs` · `saveDoc` · `updateDocBody` 모양 그대로)

- [ ] **Step 1: 실패하는 테스트**

`src/lib/storage/docs.test.ts` 끝에 추가 (`hashOf`는 이미 import됨):
```ts
describe('문서 자리 docs/', () => {
  const at = (id: string, ...p: string[]) => path.join(dir, 'ideas', id, ...p);
  const exists = (p: string) => fs.stat(p).then(() => true, () => false);

  it('새로 만든 문서는 docs/에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '# 기획안', { sourceHash: 'h' });
    expect(await exists(at(idea.id, 'docs', 'plan.md'))).toBe(true);
    expect(await exists(at(idea.id, 'plan.md'))).toBe(false);
  });

  it('예전 자리에만 있으면 그대로 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(at(idea.id, 'plan.md'), '# 예전');
    expect((await getDocs(idea.id))[0].content).toBe('# 예전');
  });

  it('예전 자리 문서를 고치면 docs/로 가고, 이전 판은 .history/에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(at(idea.id, 'plan.md'), '# 예전');
    await updateDocBody(idea.id, 'plan', '# 새로');
    expect(await exists(at(idea.id, 'plan.md'))).toBe(false);
    expect(await fs.readFile(at(idea.id, 'docs', 'plan.md'), 'utf8')).toContain('# 새로');
    expect((await fs.readdir(at(idea.id, '.history'))).some((f) => f.startsWith('plan-'))).toBe(true);
  });

  it('두 곳에 다 있으면 docs/가 이긴다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await fs.writeFile(at(idea.id, 'plan.md'), '# 예전');
    await fs.mkdir(at(idea.id, 'docs'));
    await fs.writeFile(at(idea.id, 'docs', 'plan.md'), '# 새 자리');
    expect((await getDocs(idea.id))[0].content).toBe('# 새 자리');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/storage/docs.test.ts`
Expected: FAIL — 첫 테스트(`docs/plan.md` 없음), 셋째 · 넷째

- [ ] **Step 3: 구현**

`src/lib/storage/docs.ts` — `docPath` 한 줄을 아래로 바꾼다:
```ts
// 생성 문서는 <id>/docs/. 예전 자리(<id>/<file>)는 읽기만 대체하고, 쓸 때 keepHistory가 .history/로 옮긴다 (spec 구조화 §4)
const docPath = (id: string, key: DocKey) => path.join(ideaDir(id), 'docs', stepOf(key).file);
const oldDocPath = (id: string, key: DocKey) => path.join(ideaDir(id), stepOf(key).file);
```
`readRaw`:
```ts
async function readRaw(id: string, key: DocKey) {
  for (const p of [docPath(id, key), oldDocPath(id, key)]) {
    try {
      return await fs.readFile(p, 'utf8');
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
  }
  return null;
}
```
쓰기 두 곳(`saveDoc` · `updateDocBody`)의 `await keepHistory(id, docPath(id, key), key);` 한 줄을 아래로:
```ts
  await keepOld(id, key);
```
그리고 `readRaw` 아래에:
```ts
/** 쓰기 전: 두 자리의 지금 판을 .history/로 옮기고 docs/ 폴더를 만든다 */
async function keepOld(id: string, key: DocKey) {
  await keepHistory(id, docPath(id, key), key);
  await keepHistory(id, oldDocPath(id, key), key);
  await fs.mkdir(path.dirname(docPath(id, key)), { recursive: true });
}
```

`src/lib/storage/CLAUDE.md` 저장 형식 `같은 폴더에 문서 \`plan.md\` 등`을 `생성 문서는 \`<id>/docs/plan.md\` 등 (예전 자리 \`<id>/plan.md\`도 읽음, 쓸 때 \`docs/\`로)`로

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/storage && npm run typecheck`
Expected: PASS (예전 자리에 직접 파일을 쓰는 기존 테스트도 대체 읽기로 그대로 통과)

- [ ] **Step 5: 커밋**
```bash
git add src/lib/storage/docs.ts src/lib/storage/docs.test.ts src/lib/storage/CLAUDE.md
git commit -m "feat(bank): 생성 문서를 아이디어 안 docs/로 (#55)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: 자동 목록 파일 `목록.md`

**Files:**
- Create: `src/lib/storage/index-file.ts`
- Modify: `src/lib/storage/ideas.ts` · `src/lib/storage/CLAUDE.md`
- Test: `src/lib/storage/ideas.test.ts`

**Interfaces:**
- Consumes: `groupFolders` · `UNFILED` (Task 1) · `listIdeas`
- Produces: `indexMarkdown(ideas: Idea[]): string` (순수) · `writeIndex(ideas: Idea[]): Promise<void>` (실패해도 throw 안 함)

- [ ] **Step 1: 실패하는 테스트**

`src/lib/storage/ideas.test.ts` 끝에 추가 (import에 `indexMarkdown`은 `./index-file`에서):
```ts
describe('목록.md', () => {
  const read = () => fs.readFile(path.join(dir, '목록.md'), 'utf8');

  it('만들면 쓰이고, 폴더별 · 미분류 맨 끝 · 링크', async () => {
    const a = await createIdea({ title: '클래스 추천', memo: '퇴근길 도예\n둘째 줄', folder: '취미' });
    const b = await createIdea({ title: '회의록', memo: '', folder: '' });
    const md = await read();
    expect(md.split('\n').slice(0, 2)).toEqual(['# Hatch 아이디어 목록', '자동으로 만든 파일이에요. 고쳐도 다음 저장 때 다시 쓰여요.']);
    expect(md.indexOf('## 취미')).toBeLessThan(md.indexOf('## 미분류'));
    expect(md).toContain(`- [클래스 추천](ideas/${a.id}/idea.md) — 퇴근길 도예`);
    expect(md).toContain(`- [회의록](ideas/${b.id}/idea.md)`);
  });

  it('고치거나 휴지통으로 보내면 다시 쓰인다', async () => {
    const a = await createIdea({ title: '처음', memo: '' });
    await updateIdea(a.id, { title: '바꿈' });
    expect(await read()).toContain('[바꿈]');
    await trashIdea(a.id);
    expect(await read()).not.toContain('[바꿈]');
  });

  it('메모 첫 줄은 40자까지', () => {
    const md = indexMarkdown([{ id: '20261029-0000-aaaa', title: 't', memo: '가'.repeat(50), createdAt: '', updatedAt: '', context: EMPTY_CONTEXT, folder: '' }]);
    expect(md).toContain(`— ${'가'.repeat(40)}…`);
  });
});
```
(import에 `EMPTY_CONTEXT`가 없으면 `.`에서 더한다)

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/storage/ideas.test.ts`
Expected: FAIL — `./index-file` 없음

- [ ] **Step 3: 구현**

`src/lib/storage/index-file.ts`:
```ts
import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import { groupFolders, UNFILED } from './folders';
import { dataDir } from './paths';
import type { Idea } from './types';

const MEMO_MAX = 40;

/** 파인더 · 옵시디언에서 폴더 이름(id)만으로 못 찾는 걸 돕는 목록. 폴더 가나다순, 미분류 맨 끝, 폴더 안은 최근 수정순 */
export function indexMarkdown(ideas: Idea[]): string {
  const lines = ['# Hatch 아이디어 목록', '자동으로 만든 파일이에요. 고쳐도 다음 저장 때 다시 쓰여요.'];
  const folders = groupFolders(ideas);
  const order = folders.length > 0 ? folders.map((f) => f.name) : [''];
  for (const name of order) {
    lines.push('', `## ${name || UNFILED}`);
    const inFolder = ideas.filter((i) => i.folder === name).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const i of inFolder) {
      const first = i.memo.split('\n')[0].trim();
      const memo = first.length > MEMO_MAX ? `${first.slice(0, MEMO_MAX)}…` : first;
      lines.push(`- [${i.title}](ideas/${i.id}/idea.md)${memo ? ` — ${memo}` : ''}`);
    }
  }
  return lines.join('\n') + '\n';
}

/** 아이디어를 만들거나 고치거나 휴지통으로 보낸 뒤 부른다. 실패해도 저장은 막지 않는다 */
export async function writeIndex(ideas: Idea[]) {
  try {
    await fs.writeFile(path.join(dataDir(), '목록.md'), indexMarkdown(ideas));
  } catch (e) {
    console.error('[hatch] 목록.md', e);
  }
}
```
(아이디어가 없으면 `## 미분류` 제목만 있는 목록이 된다)

`src/lib/storage/ideas.ts`
- import `import { writeIndex } from './index-file';`
- `createIdea` · `updateIdea`의 `await writeIdea(…);` 다음 줄에 `await refreshIndex();`, `trashIdea`의 `await fs.rename(…);` 다음 줄에 `await refreshIndex();`
- `updateIdeaContext`에는 넣지 않는다 (제목 · 폴더가 안 바뀜)
- `refreshIndex`는 `listIdeas` 아래에 둔다. `listIdeas`가 throw해도 저장이 실패한 것처럼 보이면 안 되므로 감싼다:
```ts
const refreshIndex = () =>
  listIdeas()
    .then(({ ideas }) => writeIndex(ideas))
    .catch((e) => console.error('[hatch] 목록.md', e));
```

`src/lib/storage/CLAUDE.md` 파일 지도에 `` · `index-file.ts` — `목록.md` 자동 쓰기 ``, 저장 형식에 `` `$HATCH_DATA_DIR/목록.md` — 폴더별 아이디어 목록 (만들기 · 고치기 · 휴지통 때 다시 씀) ``

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/storage && npm run typecheck`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add src/lib/storage/index-file.ts src/lib/storage/ideas.ts src/lib/storage/ideas.test.ts src/lib/storage/CLAUDE.md
git commit -m "feat(bank): 데이터 폴더에 목록.md 자동 쓰기 (#55)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: 데모 문서 옮기기 · 확인 · 기록 (Part 2 마무리)

**Files:**
- Move: `demo-data/ideas/*/plan.md` 등 생성 문서 → `demo-data/ideas/*/docs/`
- Create: `docs/decisions/2026-10-29_저장-정리.md` · `demo-data/목록.md`
- Modify: `docs/decisions/README.md`

- [ ] **Step 1: 데모 문서 옮기기**

```bash
for d in demo-data/ideas/*/; do
  mkdir -p "$d/docs"
  for f in plan roadmap prd spec data dev-prompt design-prompt; do
    [ -f "$d/$f.md" ] && git mv "$d/$f.md" "$d/docs/$f.md"
  done
done
git status --short demo-data
```
Expected: 생성 문서만 `docs/` 아래로 rename, `idea.md` · `decisions.md` · `questions.md` · `tools/`는 그대로

`demo-data/목록.md` — 데모는 쓰기가 막혀 자동으로 안 생기므로, 임시 데이터 폴더에 데모 아이디어를 복사해 dev에서 아이디어 하나를 고쳐 저장 → 생긴 `목록.md`를 `demo-data/목록.md`로 복사 (내용에 지어낸 정보가 없는지 확인)

- [ ] **Step 2: 화면 확인**

dev(임시 데이터): 예전 자리 문서가 있는 아이디어를 열어 문서가 그대로 보임 → 그 문서를 편집 저장 → 파일이 `docs/`로 가고 화면 그대로 → 요약 판 · 진행 배지 · 도구 입력(아이디어 문서 고르기)에 그 문서가 나옴 → 데이터 폴더 `목록.md`가 폴더별로 정리됨 · 콘솔 오류 없음
dev를 끄고 `npm run build` 뒤 `hatch-demo`: 데모 문서 탭 · 요약 판 · 도구 결과가 전처럼 보이고 "오래됨" 새로 없음

- [ ] **Step 3: why 기록**

`docs/decisions/2026-10-29_저장-정리.md`:
```markdown
# 생성 문서는 docs/에, 데이터 폴더엔 목록 파일

**날짜**: 2026-10-29
**관련 파일**: docs.ts, index-file.ts

## What — 무엇이 달라졌나
아이디어 폴더 안에서 AI가 만든 문서는 docs/ 폴더에 모이고, 데이터 폴더 맨 위에 폴더별 아이디어 목록 파일(목록.md)이 생긴다.

## Why — 왜 필요했나
파인더로 데이터 폴더를 열면 날짜와 기호로 된 폴더 이름만 보여 어느 아이디어인지 몰랐고, 아이디어 폴더 안에는 사람이 적은 것과 AI가 만든 것이 열 개 넘게 섞여 있었다.

## 판단 근거
- 폴더 이름은 바꾸지 않는다. 제목을 고칠 때마다 폴더를 옮기면 링크가 깨지므로, 이름으로 찾는 일은 목록 파일이 맡는다.
- 사람이 적는 아이디어 · 결정 · 확인 질문은 바로 보이는 자리에 두고, 다시 만들 수 있는 생성 문서만 한 폴더로 모은다.
- 이미 쓰던 데이터를 한 번에 옮기지 않는다. 예전 자리도 그대로 읽고, 문서를 다시 만들거나 고칠 때 하나씩 옮겨진다.
```
`docs/decisions/README.md` 표 끝: `| 10-29 | [생성 문서는 docs/에, 데이터 폴더엔 목록 파일](2026-10-29_저장-정리.md) |`

- [ ] **Step 4: 전체 검증 · 커밋**

dev를 끄고 Run: `npm run lint && npm run typecheck && npm test && npm run build` → 모두 통과
```bash
git add demo-data docs/decisions
git commit -m "docs(bank): 데모 문서 docs/로 · 저장 정리 why 기록 (#55)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
