import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

import { groupFolders, UNFILED } from './folders';
import { dataDir } from './paths';
import type { Idea } from './types';

const MEMO_MAX = 40;

/** 파인더 · 옵시디언에서 폴더 이름(id)만으로 못 찾는 걸 돕는 목록. 폴더 가나다순, 미분류 맨 끝, 폴더 안은 최근 수정순 */
export function indexMarkdown(ideas: Idea[]): string {
  const lines = ['# Hatch 아이디어 목록', '자동으로 만든 파일이에요. 고쳐도 다음 저장 때 다시 쓰여요.'];
  const folders = groupFolders(ideas);
  const order = folders.length > 0 ? folders.map((f) => f.name) : [''];
  for (const name of order) {
    lines.push('', `## ${name || UNFILED}`);
    const inFolder = ideas.filter((i) => i.folder === name).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const i of inFolder) {
      // 글자(코드 포인트) 단위로 잘라 이모지가 반으로 깨지지 않게
      const chars = Array.from(i.memo.split('\n')[0].trim());
      const memo = chars.length > MEMO_MAX ? `${chars.slice(0, MEMO_MAX).join('').trimEnd()}…` : chars.join('');
      lines.push(`- [${i.title}](ideas/${i.id}/idea.md)${memo ? ` — ${memo}` : ''}`);
    }
  }
  return lines.join('\n') + '\n';
}

/** 아이디어를 만들거나 고치거나 휴지통으로 보낸 뒤 부른다. 실패해도 저장은 막지 않는다 */
export async function writeIndex(ideas: Idea[]) {
  try {
    await fs.writeFile(path.join(dataDir(), '목록.md'), indexMarkdown(ideas));
  } catch (e) {
    console.error('[hatch] 목록.md', e);
  }
}
