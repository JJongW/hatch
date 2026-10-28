import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { getDocs, getIdea, isValidId } from '@/lib/storage';

import { trashIdeaAction, updateIdeaAction } from '../../actions';
import IdeaDetail from './idea-detail';

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!isValidId(id)) notFound();

  const idea = await getIdea(id);
  if (!idea) notFound();
  const docs = await getDocs(id);

  return (
    <IdeaDetail
      idea={{ title: idea.title, memo: idea.memo }}
      docs={docs}
      updateAction={updateIdeaAction.bind(null, id)}
      trashAction={trashIdeaAction.bind(null, id)}
    />
  );
}
