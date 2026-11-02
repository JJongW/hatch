'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, Tab, TabList, TabListItem, TabPanel, TextButton } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import IdeaForm from '../../_components/idea-form';
import PageHeader from '../../_components/page-header';
import { useConfirmSubmit } from '../../_components/use-confirm-submit';
import { useRefreshWhile } from '../../_components/use-refresh-while';

import ContextPanel from './context-panel';
import DecisionsPanel from './decisions-panel';
import { detailStats } from './detail-stats';
import DocCard from './doc-card';
import DocTabs from './doc-tabs';
import EvidencePanel from './evidence-panel';
import { firstTab } from './first-tab';
import NextBand from './next-band';
import QuestionsPanel from './questions-panel';
import StatusCards, { type DetailTab } from './status-cards';

import type { Doc, DocKey, IdeaContext } from '@/lib/storage';
import type { QuestionView, Summary } from '@/lib/summary';
import { formatCost, formatTokens } from '@/lib/usage/summary';
import type { ContextState, DecisionState, DocActionState, FormState, QuestionsState } from '../../actions';

// 탭 안 위 여백. 숨은 탭은 Montage가 감춘다
const PANEL = { paddingTop: '20px' };

type Props = {
  idea: { title: string; memo: string; folder: string };
  folders: string[];
  ideaId: string;
  context: IdeaContext;
  contextFields: ReadonlyArray<{ key: keyof IdeaContext; label: string }>;
  saveContextAction: (prev: ContextState, formData: FormData) => Promise<ContextState>;
  saveDecisionAction: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  removeDecisionAction: (decisionId: string) => Promise<void>;
  summary: Summary;
  questions: QuestionView;
  makeQuestionsAction: () => Promise<QuestionsState>;
  docs: Doc[];
  generatable: DocKey[];
  /** 서버가 아는 생성 중 문서 */
  running: DocKey | null;
  generateAction: (key: DocKey, prev: DocActionState) => Promise<DocActionState>;
  updateDocAction: (key: DocKey, prev: DocActionState, formData: FormData) => Promise<DocActionState>;
  updateAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  trashAction: () => Promise<void>;
  /** 이 아이디어에 쓴 사용량 합계. 기록이 없으면 null (줄을 숨김) */
  usage: { calls: number; tokens: number; cost: number } | null;
};

export default function IdeaDetail({
  idea,
  folders,
  ideaId,
  context,
  contextFields,
  saveContextAction,
  saveDecisionAction,
  removeDecisionAction,
  summary,
  questions,
  makeQuestionsAction,
  docs,
  generatable,
  running,
  generateAction,
  updateDocAction,
  updateAction,
  trashAction,
  usage,
}: Props) {
  // 이 화면에서 시작한 생성 (서버 running이 갱신되기 전에도 다른 카드를 막는다)
  const [busy, setBusy] = useState<DocKey | null>(null);
  const [asking, setAsking] = useState(false);
  const demo = useDemo();
  // 다른 탭 · 새로고침 뒤의 생성 중 표시는 서버 값을 3초마다 다시 받아 맞춘다
  useRefreshWhile(running !== null && busy === null);
  // Server Action은 클라이언트에서 하나씩 실행되므로 생성 중엔 다른 저장 버튼을 막는다
  const generating = (busy ?? running) !== null || asking;
  const ask = useConfirmSubmit();
  const confirmTrash = ask({ title: '휴지통으로 옮길까요?', content: '~/Hatch/.trash로 옮겨요. 파일은 지워지지 않아요.', confirm: '휴지통으로' });

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<DocKey>(() => firstTab(docs, summary.next));
  // 본문 탭. 처음은 문서 (spec detail-dashboard §2-4)
  const [section, setSection] = useState<DetailTab>('docs');
  // 현황 칸, 근거 링크로 탭을 바꾸면 그 탭으로 초점을 옮긴다 (키보드, 화면 읽기 사용자가 바뀐 곳을 알게)
  const tabsRef = useRef<HTMLDivElement>(null);
  const openSection = (next: DetailTab) => {
    setSection(next);
    requestAnimationFrame(() => {
      const el = tabsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      el?.focus();
      el?.scrollIntoView({ block: 'nearest' });
    });
  };
  // 결정 폼은 화면 전체에서 하나만 연다. 확인 질문 탭과 결정 탭이 같은 질문을 동시에 열지 않게
  const [formIn, setFormIn] = useState<'questions' | 'decisions' | null>(null);
  const onQuestionsForm = useCallback((open: boolean) => setFormIn((f) => (open ? 'questions' : f === 'questions' ? null : f)), []);
  const onDecisionsForm = useCallback((open: boolean) => setFormIn((f) => (open ? 'decisions' : f === 'decisions' ? null : f)), []);
  const openDoc = (key: DocKey) => {
    setSection('docs');
    setTab(key);
  };
  const stats = detailStats(docs, busy ?? running, questions, summary.decisions);
  const tabCount = (n: number) => (n > 0 ? ` ${n}` : '');
  // 저장에 성공하면 읽기로 돌아간다
  const saveIdea = async (prev: FormState, fd: FormData) => {
    const next = await updateAction(prev, fd);
    if (!next.error) setEditing(false);
    return next;
  };

  return (
    // 다음 할 일과 현황은 12px로 붙이고, 머리와 탭은 한 칸(12px) 더 띄운다 (spec detail-dashboard §2)
    <FlexBox flexDirection="column" gap="12px">
      {editing ? (
        <PageHeader title="아이디어 수정" />
      ) : (
        <FlexBox justifyContent="space-between" alignItems="flex-start" gap="12px">
          <Box>
            {idea.folder && (
              <ContentBadge size="xsmall" variant="outlined" color="neutral" sx={{ marginBottom: '8px' }}>
                {idea.folder}
              </ContentBadge>
            )}
            <PageHeader
              title={idea.title}
              description={idea.memo || undefined}
              meta={
                usage && (
                  <TextButton as={Link} href={`/usage?idea=${ideaId}`} size="small" color="assistive" sx={{ whiteSpace: 'normal', textAlign: 'left', alignSelf: 'flex-start' }}>
                    {`이 아이디어에 쓴 토큰 약 ${formatTokens(usage.tokens)}, 정가 기준 약 ${formatCost(usage.cost)} (호출 ${usage.calls}번)`}
                  </TextButton>
                )
              }
            />
          </Box>
          {!demo && (
            <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(true)} disabled={generating}>
              수정
            </Button>
          )}
        </FlexBox>
      )}

      {editing && (
        <Box sx={{ marginBottom: '24px' }}>
          <IdeaForm action={saveIdea} submitLabel="수정 저장" initial={idea} folders={folders} disabled={generating} />
          <FlexBox justifyContent="space-between" sx={{ marginTop: '8px' }}>
            <form action={trashAction} onSubmit={confirmTrash}>
              <Button type="submit" variant="outlined" color="assistive" size="small" disabled={generating}>
                휴지통으로
              </Button>
            </form>
            <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(false)}>
              취소
            </Button>
          </FlexBox>
        </Box>
      )}
      {/* 아이디어 수정 중에도 마운트해 둔다 (열어 둔 맥락 폼이 사라지지 않게).
          머리 아래 여백(24px)에 바로 붙이려고 gap 12px만큼 당긴다 */}
      <Box sx={{ marginTop: '-12px', marginBottom: '12px' }}>
        <ContextPanel context={context} fields={contextFields} action={saveContextAction} disabled={generating} />
      </Box>

      <NextBand next={summary.next} docs={docs} ideaId={ideaId} onOpenDoc={openDoc} />
      <StatusCards stats={stats} onOpen={openSection} />

      <Box ref={tabsRef} sx={{ marginTop: '12px' }}>
        <Tab value={section} onValueChange={(v) => setSection(v as DetailTab)}>
          <TabList size="medium" resize="hug">
            <TabListItem value="docs">문서</TabListItem>
            <TabListItem value="questions">{`확인 질문${tabCount(stats.questions.open)}`}</TabListItem>
            <TabListItem value="decisions">{`결정${tabCount(stats.decisions.decided)}`}</TabListItem>
            <TabListItem value="evidence">문제와 근거</TabListItem>
          </TabList>
          {/* 생성 중 상태와 열어 둔 폼이 탭을 오가도 남도록 모두 마운트해 둔다 */}
          <TabPanel value="docs" mountMode="force-mount" sx={PANEL}>
            <DocTabs
              docs={docs}
              running={busy ?? running}
              value={tab}
              onChange={setTab}
              render={(doc) => (
                <DocCard
                  doc={doc}
                  ready={generatable.includes(doc.key)}
                  hasSource={doc.from === 'idea' || docs.find((d) => d.key === doc.from)?.content != null}
                  running={busy ?? running}
                  onBusy={setBusy}
                  locked={asking}
                  generate={generateAction}
                  update={updateDocAction}
                />
              )}
            />
          </TabPanel>
          <TabPanel value="questions" mountMode="force-mount" sx={PANEL}>
            <QuestionsPanel view={questions} action={makeQuestionsAction} saveDecision={saveDecisionAction} onBusy={setAsking} disabled={generating} locked={formIn === 'decisions'} onForm={onQuestionsForm} />
          </TabPanel>
          <TabPanel value="decisions" mountMode="force-mount" sx={PANEL}>
            <DecisionsPanel decisions={summary.decisions} saveDecision={saveDecisionAction} removeDecision={removeDecisionAction} disabled={generating} locked={formIn === 'questions'} onForm={onDecisionsForm} />
          </TabPanel>
          <TabPanel value="evidence" mountMode="force-mount" sx={PANEL}>
            <EvidencePanel summary={summary} unknownPlaces={questions.unknownTotal} onOpenQuestions={() => openSection('questions')} />
          </TabPanel>
        </Tab>
      </Box>
    </FlexBox>
  );
}
