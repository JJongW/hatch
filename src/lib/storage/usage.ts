import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import { dataDir, isMissing } from './paths';
import { USAGE_FILE_VERSION, type UsageEntry } from './types';

const usageFile = () => path.join(dataDir(), 'usage.jsonl');

/** 호출 한 번을 한 줄로 덧붙인다. 실패해도 던지지 않는다 — 장부 때문에 생성이 막히면 안 된다 */
export async function appendUsage(entry: Omit<UsageEntry, 'v'>): Promise<void> {
  try {
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.appendFile(usageFile(), `${JSON.stringify({ v: USAGE_FILE_VERSION, ...entry })}\n`);
  } catch (e) {
    console.error('[hatch] usage.jsonl', e);
  }
}

const isEntry = (x: unknown): x is UsageEntry => {
  const e = x as Partial<UsageEntry> | null;
  return (
    !!e && e.v === USAGE_FILE_VERSION && typeof e.feature === 'string' && typeof e.key === 'string' &&
    typeof e.at === 'string' && typeof e.ok === 'boolean' && typeof e.ms === 'number'
  );
};

/** 장부 전체. 깨진 줄은 건너뛰고 개수만 알린다 (1MB를 넘으면 읽기 속도를 보고 월별로 나눈다) */
export async function listUsage(): Promise<{ entries: UsageEntry[]; unreadable: number }> {
  let raw: string;
  try {
    raw = await fs.readFile(usageFile(), 'utf8');
  } catch (e) {
    if (isMissing(e)) return { entries: [], unreadable: 0 };
    throw e;
  }
  const entries: UsageEntry[] = [];
  let unreadable = 0;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const x: unknown = JSON.parse(line);
      if (isEntry(x)) entries.push(x);
      else unreadable += 1;
    } catch {
      unreadable += 1;
    }
  }
  return { entries, unreadable };
}
