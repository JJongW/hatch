import { describe, expect, it } from 'vitest';

import { folderNames, groupFolders, pickFolder, UNFILED } from './folders';

const f = (...names: string[]) => names.map((folder) => ({ folder }));

describe('groupFolders', () => {
  it('폴더별 수, 가나다순, 미분류는 맨 끝', () => {
    expect(groupFolders(f('회의', '', '취미', '회의'))).toEqual([
      { name: '취미', count: 1 },
      { name: '회의', count: 2 },
      { name: '', count: 1 },
    ]);
  });
  it('전부 미분류면 빈 목록 (칩 줄을 숨긴다)', () => {
    expect(groupFolders(f('', ''))).toEqual([]);
  });
});

describe('pickFolder', () => {
  const folders = groupFolders(f('취미', ''));
  it('있는 이름은 그대로, 미분류는 빈 문자열', () => {
    expect(pickFolder(folders, '취미')).toBe('취미');
    expect(pickFolder(folders, UNFILED)).toBe('');
  });
  it('없거나 모르는 이름은 전체(null)', () => {
    expect(pickFolder(folders, undefined)).toBeNull();
    expect(pickFolder(folders, '없는 폴더')).toBeNull();
    expect(pickFolder(groupFolders(f('취미')), UNFILED)).toBeNull();
  });
});

describe('folderNames', () => {
  it('미분류를 뺀 이름만', () => {
    expect(folderNames(groupFolders(f('회의', '', '취미')))).toEqual(['취미', '회의']);
  });
});
