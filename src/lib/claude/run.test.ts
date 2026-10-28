import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainError, isClaudeBusy, runClaude } from './run';

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
    expect(out.args).toEqual(expect.arrayContaining(['-p', '--no-session-persistence']));
    expect(out.args[out.args.indexOf('--tools') + 1]).toBe('');
    expect(out.args[out.args.indexOf('--setting-sources') + 1]).toBe('project');
    expect(JSON.parse(out.args[out.args.indexOf('--json-schema') + 1])).toEqual(schema);
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

  it('시간 초과 뒤 자식이 끝나면 잠금이 풀려 다음 실행이 된다', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, timeoutMs: 200 })).rejects.toThrow('5분 안에');
    expect(isClaudeBusy()).toBe(false);
    process.env.FAKE_CLAUDE = 'ok';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema })).resolves.toBeDefined();
  });

  it('SIGTERM을 무시해도 유예 뒤 SIGKILL로 끝낸다', async () => {
    process.env.FAKE_CLAUDE = 'stubborn';
    await expect(
      runClaude({ prompt: 'x', jsonSchema: schema, timeoutMs: 300, killGraceMs: 200 }),
    ).rejects.toThrow('5분 안에');
    expect(isClaudeBusy()).toBe(false);
  });

  it('큰 한글 출력이 청크로 나뉘어도 그대로 온다', async () => {
    process.env.FAKE_CLAUDE = 'korean';
    const out = (await runClaude({ prompt: 'x', jsonSchema: schema })) as { text: string };
    expect(out.text).toBe('가'.repeat(100000));
  });

  it('손자가 stdout을 붙잡아 close가 안 와도 시간 초과 뒤 잠금이 풀린다', async () => {
    process.env.FAKE_CLAUDE = 'grandchild';
    const started = Date.now();
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, timeoutMs: 300 })).rejects.toThrow('5분 안에');
    expect(Date.now() - started).toBeLessThan(1500); // 손자(2.5초)가 끝나길 기다리지 않는다
    expect(isClaudeBusy()).toBe(false);
  });

  it('임시 폴더를 못 만들면 ChainError이고 잠금이 풀린다', async () => {
    const spy = vi.spyOn(fs, 'mkdtemp').mockRejectedValueOnce(new Error('ENOSPC'));
    const errLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runClaude({ prompt: 'x', jsonSchema: schema })).rejects.toThrow(ChainError);
    expect(isClaudeBusy()).toBe(false);
    spy.mockRestore();
    errLog.mockRestore();
  });
});
