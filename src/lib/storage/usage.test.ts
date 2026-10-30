import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appendUsage, listUsage } from './usage';
import type { UsageEntry } from './types';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const entry = (over: Partial<UsageEntry> = {}): Omit<UsageEntry, 'v'> => ({
  feature: 'doc', key: 'plan', ideaId: '20261030-1642-iqka', again: false,
  at: '2026-10-30T07:43:17.000Z', ok: true, ms: 18200, turns: 1,
  input: 2, cacheWrite: 4683, cacheRead: 0, output: 1967, costUSD: 0.077, model: 'claude-opus-5-5', promptChars: 799,
  ...over,
});

describe('usage 장부', () => {
  it('장부가 없으면 빈 목록', async () => {
    expect(await listUsage()).toEqual({ entries: [], unreadable: 0 });
  });

  it('덧붙인 순서대로 읽고 v: 1이 붙는다', async () => {
    await appendUsage(entry());
    await appendUsage(entry({ key: 'roadmap', again: true }));
    const { entries, unreadable } = await listUsage();
    expect(unreadable).toBe(0);
    expect(entries.map((e) => [e.v, e.key, e.again])).toEqual([[1, 'plan', false], [1, 'roadmap', true]]);
    const raw = await fs.readFile(path.join(dir, 'usage.jsonl'), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('깨진 줄과 모양이 다른 줄은 건너뛰고 개수만 센다', async () => {
    await appendUsage(entry());
    await fs.appendFile(path.join(dir, 'usage.jsonl'), '{깨짐\n{"v":2,"feature":"doc"}\n\n');
    await appendUsage(entry({ key: 'prd' }));
    const { entries, unreadable } = await listUsage();
    expect(entries.map((e) => e.key)).toEqual(['plan', 'prd']);
    expect(unreadable).toBe(2);
  });

  it('필드 타입이 틀린 줄도 건너뛰고 센다 (예: 비용이 문자열)', async () => {
    await fs.writeFile(path.join(dir, 'usage.jsonl'), `${JSON.stringify({ ...entry(), v: 1, costUSD: '0.1' })}\n`);
    const { entries, unreadable } = await listUsage();
    expect(entries).toHaveLength(0);
    expect(unreadable).toBe(1);
  });

  it('데이터 폴더가 아직 없어도 만들어 쓴다', async () => {
    process.env.HATCH_DATA_DIR = path.join(dir, 'new');
    await appendUsage(entry());
    expect((await listUsage()).entries).toHaveLength(1);
  });

  it('쓰기에 실패해도 던지지 않는다', async () => {
    const spy = vi.spyOn(fs, 'appendFile').mockRejectedValueOnce(new Error('EACCES'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(appendUsage(entry())).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    spy.mockRestore();
    log.mockRestore();
  });
});
