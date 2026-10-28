import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { GENERATABLE } from '@/lib/chain';
import { getDocs, getIdea, getRunning, isValidId } from '@/lib/storage';

import { generateDocAction, trashIdeaAction, updateDocAction, updateIdeaAction } from '../../actions';
import IdeaDetail from './idea-detail';

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!isValidId(id)) notFound();

  const idea = await getIdea(id);
  if (!idea) notFound();
  const [docs, running] = await Promise.all([getDocs(id), getRunning(id)]);

  return (
    <IdeaDetail
      idea={{ title: idea.title, memo: idea.memo }}
      docs={docs}
      generatable={GENERATABLE}
      running={running?.key ?? null}
      generateAction={generateDocAction.bind(null, id)}
      updateDocAction={updateDocAction.bind(null, id)}
      updateAction={updateIdeaAction.bind(null, id)}
      trashAction={trashIdeaAction.bind(null, id)}
    />
  );
}
