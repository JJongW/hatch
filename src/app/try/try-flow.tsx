'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, SectionMessage, SegmentedControl, SegmentedControlItem, TextArea, Typography } from '@montage-ui/core';

import { DemoProvider } from '../_components/demo';
import DocMarkdown from '../_components/doc-markdown';
import IdeaForm from '../_components/idea-form';
import PageHeader from '../_components/page-header';
import IdeaDetail from '../ideas/[id]/idea-detail';

import type { Theme } from '@montage-ui/core';

import { collectUnknowns } from '@/lib/questions/collect';
import { CONTEXT_FIELDS, DOC_STEPS, type Decision, type DocKey, type IdeaContext } from '@/lib/storage/types';
import { questionView, summarize, vocEvidence } from '@/lib/summary';
import { TASKS } from '@/lib/survey/questions';
import { docsOf, editDoc, generate, START, tasksDone, type TryFixture, type TryState } from '@/lib/try/flow';
import { primaryActionSx } from '@/lib/theme/tokens';
import type { ContextState, DecisionState, DocActionState, FormState, QuestionsState } from '../actions';
import TryTool from './try-tool';

type View = 'detail' | 'prd-review' | 'voc';

const WAIT_MS = 1500;
const wait = (ms = WAIT_MS) => new Promise((r) => setTimeout(r, ms));
const ALL_KEYS = DOC_STEPS.map((d) => d.key);

const box = (theme: Theme) => ({ border: `1px solid ${theme.semantic.line.neutral.primary}`, borderRadius: '12px', padding: '16px' });

function TaskList({ done }: { done: boolean[] }) {
  const current = done.indexOf(false);
  return (
    <Box as="ol" sx={(t: Theme) => ({ ...box(t), listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' })} aria-label="체험 과제">
      {TASKS.map((task, i) => (
        <FlexBox as="li" key={task} alignItems="center" gap="8px" aria-current={i === current ? 'step' : undefined}>
          <Typography variant="body2" weight={i === current ? 'bold' : 'regular'} color={done[i] ? 'semantic.foreground.neutral.secondary' : undefined}>
            {i + 1}. {task}
          </Typography>
          {done[i] ? (
            <ContentBadge size="xsmall" variant="outlined" color="neutral">
              마침
            </ContentBadge>
          ) : (
            i === current && (
              <ContentBadge size="xsmall" variant="solid" color="accent">
                지금
              </ContentBadge>
            )
          )}
        </FlexBox>
      ))}
    </Box>
  );
}

// 과제 2~5는 실제 상세 화면(IdeaDetail)에 서버 액션 대신 브라우저 안의 가짜 함수를 넘겨 그대로 쓴다 (spec §2)
export default function TryFlow({ fixture }: { fixture: TryFixture }) {
  const [state, setState] = useState<TryState>(START);
  const [view, setView] = useState<View>('detail');
  // 처음부터 다시: 상세 화면의 탭, 폼 상태까지 새로 그린다
  const [round, setRound] = useState(0);
  const nextId = useRef(0);
  const done = tasksDone(state);
  const finished = done.every(Boolean);

  const docs = docsOf(state);
  const madePrd = state.made.prd?.content ?? null;

  const createIdea = async (_prev: FormState, fd: FormData): Promise<FormState> => {
    const values = { title: String(fd.get('title') ?? '').trim(), memo: String(fd.get('memo') ?? ''), folder: String(fd.get('folder') ?? '') };
    if (!values.title) return { error: '제목을 적어 주세요.', values };
    await wait(400);
    setState((s) => ({ ...s, idea: values }));
    return { savedAt: Date.now() };
  };

  const saveContext = async (_prev: ContextState, fd: FormData): Promise<ContextState> => {
    const values = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, String(fd.get(f.key) ?? '')])) as IdeaContext;
    await wait(400);
    setState((s) => ({ ...s, context: values }));
    return { savedAt: Date.now() };
  };

  const saveDecision = async (decisionId: string | null, _prev: DecisionState, fd: FormData): Promise<DecisionState> => {
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const from = get('from');
    const values = {
      question: get('question'),
      status: get('status') === 'deferred' ? 'deferred' : 'decided',
      answer: get('answer'),
      reason: get('reason'),
      from: from === 'plan' || from === 'question' ? from : 'manual',
    } as const;
    // 실제 저장과 같은 검사 문구 (storage/decisions.ts)
    if (!values.question) return { error: '정할 것을 적어 주세요.', values };
    if (values.status === 'decided' && !values.answer) return { error: '고른 답을 적어 주세요.', values };
    if (!values.reason) return { error: '이유를 적어 주세요.', values };
    await wait(400);
    setState((s) => {
      const d: Decision = { ...values, id: decisionId ?? `try-${nextId.current++}`, decidedAt: new Date().toISOString() };
      const decisions = decisionId ? s.decisions.map((x) => (x.id === decisionId ? d : x)) : [...s.decisions, d];
      return { ...s, decisions };
    });
    return { savedAt: Date.now() };
  };

  const removeDecision = async (decisionId: string) => {
    setState((s) => ({ ...s, decisions: s.decisions.filter((d) => d.id !== decisionId) }));
  };

  const makeQuestions = async (): Promise<QuestionsState> => {
    await wait();
    setState((s) => ({ ...s, questions: { ...fixture.questions, createdAt: new Date().toISOString() } }));
    return { savedAt: Date.now() };
  };

  const generateDoc = async (key: DocKey): Promise<DocActionState> => {
    await wait();
    setState((s) => generate(s, key, fixture));
    return { savedAt: Date.now() };
  };

  const updateDoc = async (key: DocKey, _prev: DocActionState, fd: FormData): Promise<DocActionState> => {
    setState((s) => editDoc(s, key, String(fd.get('body') ?? '')));
    return { savedAt: Date.now() };
  };

  const restart = () => {
    setState(START);
    setView('detail');
    setRound((r) => r + 1);
  };

  const summary = state.idea
    ? summarize({
        idea: state.idea,
        docs,
        running: null,
        voc: state.vocRan ? vocEvidence(fixture.voc.data) : null,
        reviewedPrd: state.reviews > 0,
        decisions: state.decisions,
      })
    : null;
  const { prdReview, voc } = fixture.tools;

  return (
    // 데모에서도 체험 화면의 버튼은 보이게 한다. 서버로는 아무것도 보내지 않는다
    <DemoProvider demo={false}>
      <PageHeader title="흐름 체험" description="아이디어 한 줄에서 PRD 리뷰까지, 사용자 테스트 과제를 순서대로 해 봐요." />
      <FlexBox flexDirection="column" gap="16px" key={round}>
        <SectionMessage variant="info">
          체험 모드예요. 결과는 미리 만든 예시이고, 아무것도 저장하지 않아요. 실제 생성은 1~2분 걸려요.
        </SectionMessage>
        <TaskList done={done} />

        {!state.idea || !summary ? (
          <Box sx={box}>
            <IdeaForm action={createIdea} submitLabel="아이디어 남기기" initial={{ ...fixture.idea, folder: '' }} folders={[]} />
            <Typography variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block', marginTop: '8px' }}>
              예시 아이디어가 채워져 있어요. 제목을 바꿔도 결과는 이 예시 기준으로 보여 줘요.
            </Typography>
          </Box>
        ) : (
          <>
            <SegmentedControl value={view} onValueChange={(v: string) => setView(v as View)} size="medium">
              <SegmentedControlItem value="detail">아이디어 상세</SegmentedControlItem>
              <SegmentedControlItem value="prd-review">PRD 리뷰</SegmentedControlItem>
              <SegmentedControlItem value="voc">고객 의견</SegmentedControlItem>
            </SegmentedControl>

            <Box sx={{ display: view === 'detail' ? 'block' : 'none' }}>
              <IdeaDetail
                idea={state.idea}
                folders={[]}
                ideaId="try"
                context={state.context}
                contextFields={CONTEXT_FIELDS}
                saveContextAction={saveContext}
                saveDecisionAction={saveDecision}
                removeDecisionAction={removeDecision}
                summary={summary}
                questions={questionView(state.questions, collectUnknowns(docs), state.decisions)}
                makeQuestionsAction={makeQuestions}
                docs={docs}
                generatable={ALL_KEYS}
                running={null}
                generateAction={generateDoc}
                updateDocAction={updateDoc}
                updateAction={async () => ({})}
                trashAction={async () => {}}
                usage={null}
                editable={false}
                goTool={setView}
              />
            </Box>

            {view === 'prd-review' && (
              <TryTool
                info={prdReview}
                input={
                  madePrd ? (
                    <Box sx={{ maxHeight: '240px', overflow: 'auto' }}>
                      <Typography as="div" variant="body2">
                        <DocMarkdown>{madePrd}</DocMarkdown>
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2">이 아이디어의 PRD를 리뷰해요.</Typography>
                  )
                }
                blocked={
                  madePrd ? undefined : (
                    <FlexBox alignItems="center" gap="12px" sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="body2">아이디어 상세에서 기획안, 개발 로드맵, PRD를 차례로 먼저 만들어요.</Typography>
                      <Button size="small" variant="outlined" color="assistive" onClick={() => setView('detail')}>
                        아이디어 상세로
                      </Button>
                    </FlexBox>
                  )
                }
                result={state.reviews > 0 ? fixture.prdReviews[state.reviews - 1] : null}
                runLabel={state.reviews === 0 ? '실행' : state.reviews === 1 ? (prdReview.continueLabel ?? '다시 리뷰') : null}
                onRun={async () => {
                  await wait();
                  setState((s) => ({ ...s, reviews: Math.min(2, s.reviews + 1) }));
                }}
              />
            )}

            {view === 'voc' && (
              <TryTool
                info={voc}
                input={
                  <FlexBox flexDirection="column" gap="4px">
                    <TextArea defaultValue={fixture.voc.input} minRows={8} maxRows={14} width="100%" aria-label="VOC" />
                    <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                      예시 고객 의견이 채워져 있어요. 고쳐도 결과는 예시 그대로예요.
                    </Typography>
                  </FlexBox>
                }
                result={state.vocRan ? fixture.voc.body : null}
                runLabel={state.vocRan ? null : '실행'}
                onRun={async () => {
                  await wait();
                  setState((s) => ({ ...s, vocRan: true }));
                }}
              />
            )}
          </>
        )}

        {finished && <SectionMessage variant="positive">과제를 모두 해 봤어요. 이제 설문으로 느낀 점을 알려 주세요.</SectionMessage>}
        <FlexBox justifyContent="space-between" alignItems="center" gap="12px" sx={{ flexWrap: 'wrap', marginTop: '8px' }}>
          <Button variant="outlined" color="assistive" size="small" onClick={restart}>
            처음부터 다시
          </Button>
          <Button as={Link} href="/survey" variant={finished ? 'solid' : 'outlined'} color={finished ? 'primary' : 'assistive'} sx={finished ? primaryActionSx : undefined}>
            설문하러 가기
          </Button>
        </FlexBox>
      </FlexBox>
    </DemoProvider>
  );
}
