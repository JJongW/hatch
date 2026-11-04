import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listUsage, type UsageTag } from '@/lib/storage';

import { ChainError, isClaudeBusy, runClaude } from './run';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = { type: 'object' };
const tag: UsageTag = { feature: 'doc', key: 'plan', ideaId: null, again: false };
let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
  process.env.HATCH_CLAUDE_BIN = path.join(here, 'fake-claude.mjs');
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
  delete process.env.HATCH_CLAUDE_BIN;
  delete process.env.FAKE_CLAUDE;
  delete process.env.HATCH_CLAUDE_MODEL;
});

describe('runClaude', () => {
  it('프롬프트는 stdin, 도구 없음 · 스키마 인자를 넘기고 structured_output을 돌려준다', async () => {
    const out = (await runClaude({ prompt: '안녕', jsonSchema: schema, tag })) as { echo: string; args: string[] };
    expect(out.echo).toBe('안녕');
    expect(out.args).toEqual(expect.arrayContaining(['-p', '--no-session-persistence']));
    expect(out.args[out.args.indexOf('--tools') + 1]).toBe('');
    expect(out.args[out.args.indexOf('--setting-sources') + 1]).toBe('project');
    expect(JSON.parse(out.args[out.args.indexOf('--json-schema') + 1])).toEqual(schema);
  });

  it('HATCH_CLAUDE_MODEL이 있으면 --model', async () => {
    process.env.HATCH_CLAUDE_MODEL = 'sonnet';
    const out = (await runClaude({ prompt: 'x', jsonSchema: schema, tag })) as { args: string[] };
    expect(out.args).toEqual(expect.arrayContaining(['--model', 'sonnet']));
  });

  it('is_error면 로그인 안내', async () => {
    process.env.FAKE_CLAUDE = 'error';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).rejects.toThrow('로그인 상태');
  });

  it('비정상 종료도 로그인 안내 (ChainError)', async () => {
    process.env.FAKE_CLAUDE = 'crash';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).rejects.toThrow(ChainError);
  });

  it('.mjs 경로는 실행 권한이 없어도 node로 실행한다 (Windows · npm 설치 claude)', async () => {
    const copy = path.join(dir, 'claude-cli.mjs');
    await fs.copyFile(path.join(here, 'fake-claude.mjs'), copy);
    await fs.chmod(copy, 0o644);
    process.env.HATCH_CLAUDE_BIN = copy;
    const out = (await runClaude({ prompt: '안녕', jsonSchema: schema, tag })) as { echo: string };
    expect(out.echo).toBe('안녕');
  });

  it('실행 파일이 없으면 설치 안내', async () => {
    process.env.HATCH_CLAUDE_BIN = '/nope/claude';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).rejects.toThrow('claude를 찾을 수 없어요');
  });

  it('시간 초과', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 300 })).rejects.toThrow('5분 안에');
  });

  it('동시에 두 번이면 두 번째는 거부', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    const first = runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 500 });
    await expect(runClaude({ prompt: 'y', jsonSchema: schema, tag })).rejects.toThrow('다른 문서를 만드는 중');
    await expect(first).rejects.toThrow();
  });

  it('시간 초과 뒤 자식이 끝나면 잠금이 풀려 다음 실행이 된다', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 200 })).rejects.toThrow('5분 안에');
    expect(isClaudeBusy()).toBe(false);
    process.env.FAKE_CLAUDE = 'ok';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).resolves.toBeDefined();
  });

  it('SIGTERM을 무시해도 유예 뒤 SIGKILL로 끝낸다', async () => {
    process.env.FAKE_CLAUDE = 'stubborn';
    await expect(
      runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 300, killGraceMs: 200 }),
    ).rejects.toThrow('5분 안에');
    expect(isClaudeBusy()).toBe(false);
  });

  it('큰 한글 출력이 청크로 나뉘어도 그대로 온다', async () => {
    process.env.FAKE_CLAUDE = 'korean';
    const out = (await runClaude({ prompt: 'x', jsonSchema: schema, tag })) as { text: string };
    expect(out.text).toBe('가'.repeat(100000));
  });

  it('손자가 stdout을 붙잡아 close가 안 와도 시간 초과 뒤 잠금이 풀린다', async () => {
    process.env.FAKE_CLAUDE = 'grandchild';
    const started = Date.now();
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 300 })).rejects.toThrow('5분 안에');
    expect(Date.now() - started).toBeLessThan(1500); // 손자(2.5초)가 끝나길 기다리지 않는다
    expect(isClaudeBusy()).toBe(false);
  });

  it('임시 폴더를 못 만들면 ChainError이고 잠금이 풀린다', async () => {
    const spy = vi.spyOn(fs, 'mkdtemp').mockRejectedValueOnce(new Error('ENOSPC'));
    const errLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).rejects.toThrow(ChainError);
    expect(isClaudeBusy()).toBe(false);
    spy.mockRestore();
    errLog.mockRestore();
  });
});

describe('runClaude 사용량 기록', () => {
  it('성공하면 꼬리표와 토큰, 비용, 횟수를 한 줄 남긴다', async () => {
    process.env.FAKE_CLAUDE = 'usage';
    await runClaude({ prompt: '안녕하세요', jsonSchema: schema, tag: { feature: 'tool', key: 'prd-review', ideaId: '20261030-1642-iqka', again: false } });
    const { entries } = await listUsage();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      v: 1, feature: 'tool', key: 'prd-review', ideaId: '20261030-1642-iqka', again: false, ok: true,
      turns: 2, input: 3, cacheWrite: 100, cacheRead: 10, output: 50, costUSD: 0.5, model: 'claude-test', promptChars: 5,
    });
    expect(entries[0].ms).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(entries[0].at))).toBe(false);
  });

  it('is_error면 토큰은 남기고 ok: false', async () => {
    process.env.FAKE_CLAUDE = 'error';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).rejects.toThrow('로그인 상태');
    const [e] = (await listUsage()).entries;
    expect(e).toMatchObject({ ok: false, turns: 1, input: 1, output: 0 });
  });

  it('시간 초과는 토큰 칸이 모두 null, ok: false', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 200 })).rejects.toThrow('5분 안에');
    const [e] = (await listUsage()).entries;
    expect(e).toMatchObject({ ok: false, turns: null, input: null, cacheWrite: null, cacheRead: null, output: null, costUSD: null, model: null });
  });

  it('임시 폴더 정리가 실패해도 원래 결과를 유지하고 장부 한 줄은 남긴다', async () => {
    process.env.FAKE_CLAUDE = 'usage';
    const spy = vi.spyOn(fs, 'rm').mockRejectedValueOnce(new Error('EBUSY'));
    await expect(runClaude({ prompt: 'x', jsonSchema: schema, tag })).resolves.toBeDefined();
    expect((await listUsage()).entries).toHaveLength(1);
    spy.mockRestore();
  });

  it('동시 실행으로 거부된 호출은 기록하지 않는다 (claude를 부르지 않았으니)', async () => {
    process.env.FAKE_CLAUDE = 'slow';
    const first = runClaude({ prompt: 'x', jsonSchema: schema, tag, timeoutMs: 300 });
    await expect(runClaude({ prompt: 'y', jsonSchema: schema, tag })).rejects.toThrow('다른 문서를 만드는 중');
    await expect(first).rejects.toThrow();
    expect((await listUsage()).entries).toHaveLength(1);
  });
});

describe('isClaudeBusy', () => {
  it('실행 중에만 true', async () => {
    process.env.FAKE_CLAUDE = 'ok';
    process.env.FAKE_CLAUDE_DELAY_MS = '300';
    try {
      expect(isClaudeBusy()).toBe(false);
      const p = runClaude({ prompt: 'x', jsonSchema: {}, tag });
      expect(isClaudeBusy()).toBe(true);
      await p;
      expect(isClaudeBusy()).toBe(false);
    } finally {
      delete process.env.FAKE_CLAUDE_DELAY_MS;
    }
  });
});
