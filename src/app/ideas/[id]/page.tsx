import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { GENERATABLE } from '@/lib/chain';
import { CONTEXT_FIELDS, getDocs, getIdea, getRunning, isValidId, listDecisions, listToolResults } from '@/lib/storage';
import { summarize, vocEvidence } from '@/lib/summary';

import { generateDocAction, removeDecisionAction, saveContextAction, saveDecisionAction, trashIdeaAction, updateDocAction, updateIdeaAction } from '../../actions';
import IdeaDetail from './idea-detail';

// 로컬 전용 · 항상 요청 시 렌더라 정적 셸 검증을 끈다 (docs: route-segment-config/instant, 'Disabling instant')
export const instant = false;

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!isValidId(id)) notFound();

  const idea = await getIdea(id);
  if (!idea) notFound();
  // 결과 파일을 못 읽으면 근거 · 리뷰 여부만 없는 것으로 보고 나머지는 그린다 (spec §5)
  const [docs, running, vocs, reviews, decisions] = await Promise.all([
    getDocs(id),
    getRunning(id),
    listToolResults('voc', id).catch(() => []),
    listToolResults('prd-review', id, 'prd').catch(() => []),
    listDecisions(id).catch(() => []),
  ]);
  const runningKey = running?.key ?? null;
  const summary = summarize({
    idea: { title: idea.title, memo: idea.memo },
    docs,
    running: runningKey,
    voc: vocEvidence(vocs[0]?.data),
    reviewedPrd: reviews.length > 0,
    decisions,
  });

  return (
    <IdeaDetail
      idea={{ title: idea.title, memo: idea.memo }}
      ideaId={id}
      context={idea.context}
      contextFields={CONTEXT_FIELDS}
      saveContextAction={saveContextAction.bind(null, id)}
      saveDecisionAction={saveDecisionAction.bind(null, id)}
      removeDecisionAction={removeDecisionAction.bind(null, id)}
      summary={summary}
      docs={docs}
      generatable={GENERATABLE}
      running={runningKey}
      generateAction={generateDocAction.bind(null, id)}
      updateDocAction={updateDocAction.bind(null, id)}
      updateAction={updateIdeaAction.bind(null, id)}
      trashAction={trashIdeaAction.bind(null, id)}
    />
  );
}
