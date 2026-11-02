import os from 'node:os';
import path from 'node:path';

/** 매 호출마다 읽는다 (테스트 · .env 변경 반영). `~` · `~/…` · `~\…`(Windows)만 홈으로 푼다. */
export function dataDir() {
  const dir = process.env.HATCH_DATA_DIR?.trim() || '~/Hatch';
  return /^~([\\/]|$)/.test(dir) ? path.join(os.homedir(), dir.slice(1)) : dir;
}

export const ideasDir = () => path.join(dataDir(), 'ideas');
export const ideaDir = (id: string) => path.join(ideasDir(), id);
export const ideaFile = (id: string) => path.join(ideaDir(id), 'idea.md');

export const isMissing = (e: unknown) => (e as NodeJS.ErrnoException).code === 'ENOENT';

/** PO 도구 결과 폴더. 아이디어 결과는 `ideas/<id>/tools/`, 붙여넣기 결과는 `$HATCH_DATA_DIR/tools/` */
export const toolsDir = (ideaId: string | null) =>
  ideaId === null ? path.join(dataDir(), 'tools') : path.join(ideaDir(ideaId), 'tools');
