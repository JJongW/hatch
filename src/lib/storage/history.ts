import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ideaDir } from './paths';

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); // 20261028T091500

/** 덮어쓰기 전에 이전 판을 `<id>/.history/<name>-<시각>-<rand>.md`로 (지우지 않는다) */
export async function keepHistory(id: string, from: string, name: string) {
  const exists = await fs.stat(from).then(() => true, () => false);
  if (!exists) return;
  const dir = path.join(ideaDir(id), '.history');
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(from, path.join(dir, `${name}-${stamp()}-${crypto.randomBytes(2).toString('hex')}.md`));
}
