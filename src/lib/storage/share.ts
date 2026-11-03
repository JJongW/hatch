import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';

// 공유 상태 `<id>/share.json` (spec 2026-11-03-hosted-po §3-5). 토큰 원문은 PO 맥에만 있다 (밖에는 해시만).
// 끄면 파일을 지우지 않고 token을 비운다 (지우지 않기 규칙)
export type ShareState = { token: string; createdAt: string; publishedAt: string } | { token: null; closedAt: string };

const shareFile = (id: string) => path.join(ideaDir(id), 'share.json');

export async function getShareState(id: string): Promise<ShareState | null> {
  assertValidId(id);
  try {
    const data = JSON.parse(await fs.readFile(shareFile(id), 'utf8')) as Partial<Record<string, unknown>>;
    if (typeof data.token === 'string' && typeof data.createdAt === 'string' && typeof data.publishedAt === 'string') {
      return { token: data.token, createdAt: data.createdAt, publishedAt: data.publishedAt };
    }
    if (data.token === null && typeof data.closedAt === 'string') return { token: null, closedAt: data.closedAt };
    return null; // 깨진 파일은 공유 안 함으로 본다
  } catch (e) {
    if (isMissing(e) || e instanceof SyntaxError) return null;
    throw e;
  }
}

export async function saveShareState(id: string, state: ShareState): Promise<void> {
  assertValidId(id);
  await fs.writeFile(shareFile(id), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
