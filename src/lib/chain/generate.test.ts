import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, DOC_STEPS, getDocs, getRunning, hashOf, markRunning, saveDoc, type DocKey } from '@/lib/storage';

import { runClaude } from '@/lib/claude/run';

import { generateDoc, toClaudeSchema } from './generate';
import { GENERATABLE } from './registry';
import { planStep } from './steps/plan';

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

describe('generateDoc', () => {
  it('기획안을 만들어 plan.md로 저장하고 stale=false', async () => {
    process.env.FAKE_CLAUDE = 'plan';
    const idea = await createIdea({ title: '동네 클래스', memo: '' });
    await generateDoc(idea.id, 'plan');
    const plan = (await getDocs(idea.id))[0];
    expect(plan.content).toContain('## 한 줄 요약');
    expect(plan.stale).toBe(false);
    expect(await getRunning(idea.id)).toBeNull();
  });
  it('GENERATABLE은 DOC_STEPS의 7개 key와 같다', () => {
    expect(GENERATABLE).toEqual(DOC_STEPS.map((s) => s.key));
    expect(GENERATABLE).toHaveLength(7);
  });
  it('모르는 단계는 거부', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(generateDoc(idea.id, 'nope' as DocKey)).rejects.toThrow('아직 만들 수 없는 문서');
  });
  it('prd: roadmap만 있고 plan이 없으면 앞 문서를 먼저 만들라고 한다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'roadmap', '## 개요\n로드맵', { sourceHash: hashOf('x') });
    await expect(generateDoc(idea.id, 'prd')).rejects.toThrow('앞 문서를 먼저 만들어 주세요.');
  });
  it('design-prompt: spec만 있고 데이터 구성이 없으면 앞 문서를 먼저 만들라고 한다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'spec', '## 화면\n명세', { sourceHash: hashOf('x') });
    await expect(generateDoc(idea.id, 'design-prompt')).rejects.toThrow('앞 문서를 먼저 만들어 주세요.');
  });
  it('prd: plan · roadmap이 모두 있으면 claude까지 가서 형식 검사에서 끝난다', async () => {
    process.env.FAKE_CLAUDE = 'ok';
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDoc(idea.id, 'plan', '## 한 줄 요약\n기획', { sourceHash: hashOf('x') });
    await saveDoc(idea.id, 'roadmap', '## 개요\n로드맵', { sourceHash: hashOf('x') });
    await expect(generateDoc(idea.id, 'prd')).rejects.toThrow('결과 형식이 맞지 않아요');
  });
  it('형식이 틀리면 저장하지 않고 생성 중 표시도 지운다', async () => {
    process.env.FAKE_CLAUDE = 'ok'; // { echo, args } → planSchema 불일치
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(generateDoc(idea.id, 'plan')).rejects.toThrow('결과 형식이 맞지 않아요');
    expect((await getDocs(idea.id))[0].content).toBeNull();
    expect(await getRunning(idea.id)).toBeNull();
  });
  it('claude에 넘기는 스키마에는 $schema가 없다', () => {
    const schema = toClaudeSchema(planStep.schema) as Record<string, unknown>;
    expect(schema).not.toHaveProperty('$schema');
    expect(schema.type).toBe('object');
  });
  it('이미 실행 중이면 거부하고 다른 아이디어의 생성 중 표시를 건드리지 않는다', async () => {
    const a = await createIdea({ title: 'a', memo: '' });
    const b = await createIdea({ title: 'b', memo: '' });
    process.env.FAKE_CLAUDE = 'slow';
    const slow = runClaude({ prompt: 'x', jsonSchema: {}, timeoutMs: 400, killGraceMs: 100 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    await markRunning(a.id, 'plan');
    await expect(generateDoc(b.id, 'plan')).rejects.toThrow('다른 문서를 만드는 중');
    expect(await getRunning(b.id)).toBeNull();
    expect(await getRunning(a.id)).not.toBeNull();
    await slow;
  });
});
