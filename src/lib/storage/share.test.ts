import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createIdea } from './ideas';
import { getShareState, saveShareState } from './share';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-share-'));
  vi.stubEnv('HATCH_DATA_DIR', dir);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(dir, { recursive: true, force: true });
});

describe('공유 상태 share.json', () => {
  it('없으면 null, 저장하면 읽힌다, 끄면 토큰이 비고 파일은 남는다', async () => {
    const { id } = await createIdea({ title: '회의실', memo: '' });
    expect(await getShareState(id)).toBeNull();
    const on = { token: 'A'.repeat(32), createdAt: '2026-11-03T00:00:00Z', publishedAt: '2026-11-03T00:00:00Z' };
    await saveShareState(id, on);
    expect(await getShareState(id)).toEqual(on);
    await saveShareState(id, { token: null, closedAt: '2026-11-03T01:00:00Z' });
    expect(await getShareState(id)).toEqual({ token: null, closedAt: '2026-11-03T01:00:00Z' });
  });

  it('깨진 파일은 공유 안 함, 잘못된 id는 거절', async () => {
    const { id } = await createIdea({ title: '회의실', memo: '' });
    await fs.writeFile(path.join(dir, 'ideas', id, 'share.json'), '{oops');
    expect(await getShareState(id)).toBeNull();
    await expect(getShareState('../x')).rejects.toThrow();
  });
});
