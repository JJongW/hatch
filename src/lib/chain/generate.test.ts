import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getDocs, getRunning } from '@/lib/storage';

import { generateDoc } from './generate';

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
});
