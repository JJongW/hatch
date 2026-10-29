import { connection } from 'next/server';

import { folderNames, groupFolders, listIdeasWithProgress } from '@/lib/storage';

import IdeaForm from './_components/idea-form';
import IdeaList from './_components/idea-list';
import PageHeader from './_components/page-header';
import SectionTitle from './_components/section-title';
import { toCard } from './_components/to-card';
import { createIdeaAction } from './actions';

const RECENT = 5;

export default async function WritePage() {
  await connection(); // 파일을 읽으므로 빌드 때 미리 그리지 않는다
  const { items } = await listIdeasWithProgress();
  const folders = folderNames(groupFolders(items.map((i) => i.idea)));

  return (
    <>
      <PageHeader title="아이디어 쓰기" description="떠오른 걸 한 줄로. 기획안은 나중에 이어서 만들어요." />
      <IdeaForm action={createIdeaAction} submitLabel="저장" resetOnSave folders={folders} />
      <SectionTitle>방금 적은 아이디어</SectionTitle>
      <IdeaList cards={items.slice(0, RECENT).map(toCard)} />
    </>
  );
}
