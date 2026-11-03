import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { GENERATABLE } from '@/lib/chain';
import { collectUnknowns } from '@/lib/questions';
import { isDemo } from '@/lib/demo';
import { buildSharePayload, shareCounts } from '@/lib/share/build';
import { isShareReady, shareLink } from '@/lib/share/client';
import { CONTEXT_FIELDS, folderNames, getDocs, getIdea, getQuestions, getRunning, getShareState, groupFolders, isValidId, listDecisions, listEvidence, listIdeas, listToolResults, listUsage } from '@/lib/storage';
import { questionView, summarize, vocEvidence } from '@/lib/summary';
import { summarizeUsage } from '@/lib/usage/summary';

import { generateDocAction, makeQuestionsAction, shareAction, removeDecisionAction, saveContextAction, saveDecisionAction, saveEvidenceAction, trashIdeaAction, updateDocAction, updateIdeaAction, resolveDraftAction, readVersionAction } from '../../actions';
import WidePage from '../../_components/wide-page';
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
  const [docs, running, vocs, reviews, decisions, questionSet, all, usageLog, evidence] = await Promise.all([
    getDocs(id),
    getRunning(id),
    listToolResults('voc', id).catch(() => []),
    listToolResults('prd-review', id, 'prd').catch(() => []),
    listDecisions(id).catch(() => []),
    getQuestions(id).catch(() => null),
    listIdeas().catch(() => ({ ideas: [], unreadable: 0 })),
    listUsage().catch(() => ({ entries: [], unreadable: 0 })),
    listEvidence(id).catch(() => []),
  ]);
  const folders = folderNames(groupFolders(all.ideas));
  const runningKey = running?.key ?? null;
  const summary = summarize({
    idea: { title: idea.title, memo: idea.memo },
    docs,
    running: runningKey,
    voc: vocEvidence(vocs[0]?.data),
    reviewedPrd: reviews.length > 0,
    decisions,
    evidence,
  });
  const questions = questionView(questionSet, collectUnknowns(docs), decisions, evidence);
  const used = summarizeUsage(usageLog.entries, id);
  const usage = used.calls > 0 ? { calls: used.calls, tokens: used.tokens, cost: used.cost } : null;
  // 데모에선 버튼이 없으니 계산하지 않는다
  const shareOn = isShareReady() && !isDemo();
  const shareState = shareOn ? await getShareState(id).catch(() => null) : null;
  const share = shareOn
    ? {
        active: shareState?.token
          ? { link: shareLink(shareState.token), publishedAt: new Date(shareState.publishedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) }
          : null,
        counts: shareCounts(buildSharePayload({ idea, docs, questions: questionSet, decisions })),
        action: shareAction.bind(null, id),
      }
    : undefined;

  return (
    <>
      <WidePage />
      <IdeaDetail
        idea={{ title: idea.title, memo: idea.memo, folder: idea.folder }}
        folders={folders}
        ideaId={id}
        context={idea.context}
        contextFields={CONTEXT_FIELDS}
        saveContextAction={saveContextAction.bind(null, id)}
        saveDecisionAction={saveDecisionAction.bind(null, id)}
        saveEvidenceAction={saveEvidenceAction.bind(null, id)}
        removeDecisionAction={removeDecisionAction.bind(null, id)}
        summary={summary}
        questions={questions}
        makeQuestionsAction={makeQuestionsAction.bind(null, id)}
        docs={docs}
        generatable={GENERATABLE}
        running={runningKey}
        generateAction={generateDocAction.bind(null, id)}
        updateDocAction={updateDocAction.bind(null, id)}
        resolveDraftAction={resolveDraftAction.bind(null, id)}
        readVersionAction={readVersionAction.bind(null, id)}
        updateAction={updateIdeaAction.bind(null, id)}
        trashAction={trashIdeaAction.bind(null, id)}
        usage={usage}
        share={share}
      />
    </>
  );
}
