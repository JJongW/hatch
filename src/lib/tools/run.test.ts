import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createIdea, getToolResult, hashOf, listToolResults, saveDecision, saveDoc, updateIdeaContext } from '@/lib/storage';

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
  it('sourceOptional 도구는 문서 없이 실행하고 프롬프트에 문서 블록이 빠진다', async () => {
    const optional = { ...echoTool, sourceOptional: true as const };
    const { resultId, ideaId } = await runTool(optional, { source: { none: true }, input: { note: 'ctx' } });
    expect(ideaId).toBeNull();
    const r = await getToolResult(null, resultId);
    expect(r?.source).toBe('none');
    const prompt = (r?.data as { echo: string }).echo;
    expect(prompt).not.toContain('### 입력 문서');
    expect(prompt).toContain('### 메모\nctx');
    await expect(runTool(echoTool, { source: { none: true }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
  });
  it('sourceOptional 도구도 아이디어 모드에서 문서를 못 읽으면 거절한다 (문서 없이는 none만)', async () => {
    const optional = { ...echoTool, sourceOptional: true as const };
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(runTool(optional, { source: { ideaId: idea.id, docKey: 'prd' }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
    await expect(runTool(optional, { source: { ideaId: idea.id, docKey: 'spec' }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
    await expect(runTool(optional, { source: { pasted: '  ' }, input: {} })).rejects.toThrow('입력 문서를 골라 주세요.');
    expect(await listToolResults('prd-review', idea.id)).toEqual([]);
  });
  it('validate가 문자열을 돌려주면 claude 실행 전에 거절한다', async () => {
    const guarded = { ...echoTool, validate: (i: { note: string }, prev: unknown) => (prev && !i.note ? '내 답을 적어 주세요.' : undefined) };
    const first = await runTool(guarded, { source: { pasted: 'a' }, input: {} }); // prev 없음 → 통과
    process.env.FAKE_CLAUDE = 'crash'; // 실행까지 갔다면 다른 오류가 난다
    await expect(runTool(guarded, { source: { pasted: 'a' }, input: {}, prevId: first.resultId })).rejects.toThrow('내 답을 적어 주세요.');
  });
  it('AI 출력 형식이 틀리면 저장하지 않는다', async () => {
    process.env.FAKE_CLAUDE = 'plan'; // echo 칸이 없는 출력
    await expect(runTool(echoTool, { source: { pasted: 'a' }, input: {} })).rejects.toThrow('결과 형식이 맞지 않아요');
    expect(await listToolResults('prd-review', null)).toEqual([]);
  });
});

it('아이디어 문서로 실행하면 정한 것도 같이 넘긴다', async () => {
  const idea = await createIdea({ title: 'x', memo: '' });
  await saveDoc(idea.id, 'prd', 'PRD 본문', { sourceHash: hashOf('x') });
  await saveDecision(idea.id, { question: '지역은?', status: 'decided', answer: '성수동', reason: '많다', from: 'manual' });
  const { resultId } = await runTool(echoTool, { source: { ideaId: idea.id, docKey: 'prd' }, input: {} });
  const prompt = ((await getToolResult(idea.id, resultId))?.data as { echo: string }).echo;
  expect(prompt).toContain('### 정한 것\n- 지역은? → 성수동 (이유: 많다)');
  expect(prompt).toContain('"정한 것"은 다시 묻지 말고 따른다');
});
