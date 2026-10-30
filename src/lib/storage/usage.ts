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

// 화면 계산이 믿고 쓰는 필드만 검사한다. 어긋나면 건너뛰고 개수에 넣는다
const isEntry = (x: unknown): x is UsageEntry => {
  const e = x as Partial<UsageEntry> | null;
  const num = (v: unknown) => v === null || typeof v === 'number';
  const str = (v: unknown) => v === null || typeof v === 'string';
  return (
    !!e && e.v === USAGE_FILE_VERSION && typeof e.feature === 'string' && typeof e.key === 'string' &&
    typeof e.at === 'string' && typeof e.ok === 'boolean' && typeof e.ms === 'number' &&
    typeof e.again === 'boolean' && str(e.ideaId) && typeof e.promptChars === 'number' &&
    num(e.turns) && num(e.input) && num(e.cacheWrite) && num(e.cacheRead) && num(e.output) &&
    num(e.costUSD) && str(e.model)
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
