import { connection } from 'next/server';

import { listIdeasWithProgress } from '@/lib/storage';

import IdeaList from '../_components/idea-list';
import PageHeader from '../_components/page-header';
import { toCard } from '../_components/to-card';

export default async function IdeasPage() {
  await connection();
  const { items, unreadable } = await listIdeasWithProgress();

  return (
    <>
      <PageHeader title="아이디어 모음" description={`${items.length}개 · 누르면 기획안으로 이어져요.`} />
      <IdeaList cards={items.map(toCard)} unreadable={unreadable} emptyAction />
    </>
  );
}
