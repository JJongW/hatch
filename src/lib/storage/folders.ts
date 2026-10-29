/** 아이디어 폴더 (묶음). 폴더 목록은 따로 저장하지 않고 아이디어들의 folder에서 모은다 */
export const FOLDER_MAX = 30;
/** 빈 폴더의 화면 이름이자 예약어 (이 이름으로 저장하면 빈 값) */
export const UNFILED = '미분류';

/** name '' = 미분류 */
export type FolderCount = { name: string; count: number };

/** 폴더별 수. 이름 가나다순, 미분류는 맨 끝. 폴더가 하나도 없으면 [] */
export function groupFolders(ideas: ReadonlyArray<{ folder: string }>): FolderCount[] {
  const counts = new Map<string, number>();
  for (const { folder } of ideas) counts.set(folder, (counts.get(folder) ?? 0) + 1);
  const named = [...counts].filter(([name]) => name !== '').sort(([a], [b]) => a.localeCompare(b, 'ko'));
  if (named.length === 0) return [];
  const unfiled = counts.get('');
  return [...named.map(([name, count]) => ({ name, count })), ...(unfiled ? [{ name: '', count: unfiled }] : [])];
}

/** 주소 ?folder= 값 → 고른 폴더. null = 전체, '' = 미분류. 목록에 없는 이름은 전체 */
export function pickFolder(folders: FolderCount[], raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const name = raw === UNFILED ? '' : raw;
  return folders.some((f) => f.name === name) ? name : null;
}

export const folderNames = (folders: FolderCount[]) => folders.filter((f) => f.name !== '').map((f) => f.name);
