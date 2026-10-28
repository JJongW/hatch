import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ChainError, runClaude } from './run';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = { type: 'object' };

beforeEach(() => {
  process.env.HATCH_CLAUDE_BIN = path.join(here, 'fake-claude.mjs');
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
