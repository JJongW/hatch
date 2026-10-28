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
  it('source를 주면 그 입력으로 실행한 결과만 (붙여넣기 · 문서 없이 분리)', async () => {
    const pasted = await saveToolResult({ ...base, ideaId: null, source: 'pasted' });
    const none = await saveToolResult({ ...base, ideaId: null, source: 'none' });
    expect((await listToolResults('prd-review', null, 'pasted')).map((r) => r.id)).toEqual([pasted]);
    expect((await listToolResults('prd-review', null, 'none')).map((r) => r.id)).toEqual([none]);
    expect(await listToolResults('prd-review', null)).toHaveLength(2);
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
