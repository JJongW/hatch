import { connection } from 'next/server';

import { groupFolders, listIdeasWithProgress, pickFolder } from '@/lib/storage';

import FolderChips from '../_components/folder-chips';
import IdeaList from '../_components/idea-list';
import PageHeader from '../_components/page-header';
import { toCard } from '../_components/to-card';

// 로컬 전용 · 항상 요청 시 렌더라 정적 셸 검증을 끈다 (docs: route-segment-config/instant, 'Disabling instant')
export const instant = false;

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  await connection();
  const [{ items, unreadable }, { folder }] = await Promise.all([listIdeasWithProgress(), searchParams]);
  const folders = groupFolders(items.map((i) => i.idea));
  const selected = pickFolder(folders, folder);
  const shown = selected === null ? items : items.filter((i) => i.idea.folder === selected);

  return (
    <>
      <PageHeader title="아이디어 모음" description={`${items.length}개, 누르면 기획안으로 이어져요.`} />
      <FolderChips folders={folders} total={items.length} selected={selected} />
      <IdeaList cards={shown.map(toCard)} unreadable={unreadable} emptyAction />
    </>
  );
}
