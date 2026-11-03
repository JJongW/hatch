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
import { CONTEXT_FIELDS, DOC_STEPS, EVIDENCE_MAX, EVIDENCE_SOURCES, type Decision, type DocKey, type Evidence, type IdeaContext } from '@/lib/storage/types';
import { questionView, summarize, vocEvidence } from '@/lib/summary';
import { TASKS } from '@/lib/survey/questions';
import { thenLabel } from '../ideas/[id]/next-band';
import { applyDraft, docsOf, editDoc, generate, keepCurrent, START, tasksDone, tryNext, type TryFixture, type TryState } from '@/lib/try/flow';
import type { ContextState, DecisionState, DocActionState, EvidenceState, FormState, QuestionsState } from '../actions';
import { decisionValues, evidenceValues } from '../_components/form-values';
import TryTool from './try-tool';

type View = 'detail' | 'prd-review' | 'voc';

const WAIT_MS = 1500;
const wait = (ms = WAIT_MS) => new Promise((r) => setTimeout(r, ms));
const ALL_KEYS = DOC_STEPS.map((d) => d.key);

const box = (theme: Theme) => ({ border: `1px solid ${theme.semantic.line.neutral.primary}`, borderRadius: '12px', padding: '16px' });

// current는 tryNext의 지금 과제 — 상세의 "다음 할 일"과 같은 값
function TaskList({ done, current }: { done: boolean[]; current: number }) {
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
  // PRD를 아직 안 만들었어도 리뷰를 막지 않는다: 예시 PRD로 계속 (spec 2026-11-03 §4). 예시인 것은 화면에 밝힌다
  const [examplePrd, setExamplePrd] = useState(false);
  const prdInput = madePrd ?? (examplePrd ? fixture.docs.prd : null);

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
    const raw = decisionValues(fd);
    const values = { ...raw, question: raw.question.trim(), answer: raw.status === 'deferred' ? '' : raw.answer.trim(), reason: raw.reason.trim() };
    // 실제 저장과 같은 검사 문구 (storage/decisions.ts)
    if (!values.question) return { error: '정할 것을 적어 주세요.', values };
    if (values.status !== 'deferred' && !values.answer) return { error: values.status === 'proposed' ? '제안하는 답을 적어 주세요.' : '고른 답을 적어 주세요.', values };
    if (!values.reason) return { error: '이유를 적어 주세요.', values };
    await wait(400);
    setState((s) => {
      const d: Decision = { ...values, id: decisionId ?? `try-${nextId.current++}`, decidedAt: new Date().toISOString() };
      const decisions = decisionId ? s.decisions.map((x) => (x.id === decisionId ? d : x)) : [...s.decisions, d];
      return { ...s, decisions };
    });
    return { savedAt: Date.now() };
  };

  const saveEvidence = async (evidenceId: string | null, _prev: EvidenceState, fd: FormData): Promise<EvidenceState> => {
    const raw = evidenceValues(fd);
    const values = { ...raw, text: raw.text.trim(), sourceNote: raw.sourceNote.trim() };
    // 실제 저장과 같은 검사 문구 (storage/evidence.ts)
    if (!values.text) return { error: '들은 내용을 적어 주세요.', values };
    if (!EVIDENCE_SOURCES.some((x) => x.key === values.source)) return { error: '어디서 확인했는지 골라 주세요.', values };
    if (values.text.length > EVIDENCE_MAX.text || values.sourceNote.length > EVIDENCE_MAX.sourceNote) {
      return { error: `내용은 ${EVIDENCE_MAX.text}자, 출처 메모는 ${EVIDENCE_MAX.sourceNote}자까지예요.`, values };
    }
    await wait(400);
    const id = evidenceId ?? `try-e${nextId.current++}`;
    setState((s) => {
      const e: Evidence = { ...values, id, collectedAt: new Date().toISOString() };
      // 고칠 때 질문은 처음 것 그대로 (storage/evidence.ts와 같은 규칙)
      return { ...s, evidence: evidenceId ? s.evidence.map((x) => (x.id === evidenceId ? { ...e, question: x.question } : x)) : [...s.evidence, e] };
    });
    return { savedAt: Date.now(), savedId: id };
  };

  const removeDecision = async (decisionId: string) => {
    setState((s) => ({ ...s, decisions: s.decisions.filter((d) => d.id !== decisionId) }));
  };

  const makeQuestions = async (): Promise<QuestionsState> => {
    await wait();
    // 예시 질문은 예시 기획안보다 먼저 만들어져 라벨 하나가 빠져 있다. 지금 문서의 라벨을 더해 '새로 생긴 확인 필요'가 바로 뜨지 않게 한다
    setState((s) => {
      const labels = [...new Set([...fixture.questions.labels, ...collectUnknowns(docsOf(s)).groups.map((g) => g.label)])];
      return { ...s, questions: { ...fixture.questions, labels, createdAt: new Date().toISOString() } };
    });
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

  // 실제와 같은 규칙: 다시 만든 판은 비교 후 고른다 (이전 버전은 저장이 없어 체험에서 보이지 않음)
  const resolveDraft = async (key: DocKey, _prev: DocActionState, fd: FormData): Promise<DocActionState> => {
    const mode = String(fd.get('mode') ?? '');
    setState((s) => (mode === 'keep' ? keepCurrent(s, key) : mode === 'edit' ? applyDraft(s, key, String(fd.get('body') ?? '')) : applyDraft(s, key)));
    return { savedAt: Date.now() };
  };

  const restart = () => {
    setState(START);
    setExamplePrd(false);
    setView('detail');
    setRound((r) => r + 1);
  };

  // 체험은 과제 순서가 다음 할 일을 정한다 (위 과제 목록 · 상세 "다음 할 일" · "그다음"이 한 값)
  const now = tryNext(state);
  const base = state.idea
    ? summarize({
        idea: state.idea,
        docs,
        running: null,
        voc: state.vocRan ? vocEvidence(fixture.voc.data) : null,
        reviewedPrd: state.reviews > 0,
        decisions: state.decisions,
        evidence: state.evidence,
        questionsMade: state.questions !== null,
      })
    : null;
  const summary = base && { ...base, next: now.next, then: now.then };
  const { prdReview, voc } = fixture.tools;
  // 입력 칸의 줄 수와 결과의 건수가 다르면 그 이유를 그대로 밝힌다 (지어낸 수 없이, 결과 파일의 total만 씀)
  const vocShown = fixture.voc.input.split('\n').filter(Boolean).length;
  const vocTotal = vocEvidence(fixture.voc.data)?.total ?? null;
  const vocNote =
    vocTotal === null || vocTotal === vocShown
      ? `예시 고객 의견 ${vocShown}줄이 채워져 있어요. 고쳐도 결과는 예시 그대로예요.`
      : `예시 결과는 고객 의견 ${vocTotal}줄로 만들었는데 원문 전체는 남아 있지 않아요. 여기에는 결과에 대표로 나온 ${vocShown}줄만 채웠어요. 고쳐도 결과는 예시 그대로예요.`;

  return (
    // 데모에서도 체험 화면의 버튼은 보이게 한다. 서버로는 아무것도 보내지 않는다
    <DemoProvider demo={false}>
      <PageHeader title="흐름 체험" description="아이디어 한 줄에서 PRD 리뷰까지, 사용자 테스트 과제를 순서대로 해 봐요." />
      <FlexBox flexDirection="column" gap="16px" key={round}>
        <SectionMessage variant="info">
          체험 모드예요. 결과는 미리 만든 예시이고, 아무것도 저장하지 않아요. 실제 생성은 1~2분 걸려요.
        </SectionMessage>
        <TaskList done={done} current={now.task} />

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
                saveEvidenceAction={saveEvidence}
                removeDecisionAction={removeDecision}
                summary={summary}
                questions={questionView(state.questions, collectUnknowns(docs), state.decisions, state.evidence)}
                makeQuestionsAction={makeQuestions}
                docs={docs}
                generatable={ALL_KEYS}
                running={null}
                generateAction={generateDoc}
                updateDocAction={updateDoc}
                resolveDraftAction={resolveDraft}
                updateAction={async () => ({})}
                trashAction={async () => ({})}
                usage={null}
                editable={false}
                goTool={setView}
              />
            </Box>

            {/* 도구 화면에서도 지금 과제의 주 행동은 하나 (tryNext). 이 도구가 지금 과제가 아니면 그리로 안내 */}
            {view !== 'detail' && now.task !== -1 && now.next.kind !== (view === 'prd-review' ? 'review-prd' : 'collect-voc') && (
              <FlexBox alignItems="center" justifyContent="space-between" gap="12px" sx={(t: Theme) => ({ ...box(t), flexWrap: 'wrap' })}>
                <Typography variant="body2">지금 과제: {TASKS[now.task]}</Typography>
                <Button
                  size="small"
                  onClick={() => setView(now.next.kind === 'review-prd' ? 'prd-review' : now.next.kind === 'collect-voc' ? 'voc' : 'detail')}
                >
                  {/* 도구 과제가 아니면 상세로 옮기기만 한다. 실제 행동은 상세의 "다음 할 일" 버튼이 한다 */}
                  {now.next.kind === 'review-prd' || now.next.kind === 'collect-voc'
                    ? thenLabel(now.next, (k) => DOC_STEPS.find((d) => d.key === k)?.label ?? k)
                    : '아이디어 상세로'}
                </Button>
              </FlexBox>
            )}

            {view === 'prd-review' && (
              <TryTool
                info={prdReview}
                input={
                  prdInput ? (
                    <FlexBox flexDirection="column" gap="6px">
                      {!madePrd && (
                        <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
                          예시 PRD예요. 이 아이디어에서 만든 PRD가 아니에요.
                        </Typography>
                      )}
                      <Box sx={{ maxHeight: '240px', overflow: 'auto' }}>
                        <Typography as="div" variant="body2">
                          <DocMarkdown>{prdInput}</DocMarkdown>
                        </Typography>
                      </Box>
                    </FlexBox>
                  ) : (
                    <Typography variant="body2">이 아이디어의 PRD를 리뷰해요.</Typography>
                  )
                }
                blocked={
                  prdInput ? undefined : (
                    <FlexBox alignItems="center" gap="12px" sx={{ flexWrap: 'wrap' }}>
                      <Typography variant="body2">이 아이디어의 PRD가 아직 없어요. 상세에서 만들거나 예시 PRD로 계속할 수 있어요.</Typography>
                      <Button size="small" onClick={() => setExamplePrd(true)}>
                        예시 PRD로 계속
                      </Button>
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
                      {vocNote}
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
          <Button as={Link} href="/survey" variant={finished ? 'solid' : 'outlined'} color={finished ? 'primary' : 'assistive'}>
            설문하러 가기
          </Button>
        </FlexBox>
      </FlexBox>
    </DemoProvider>
  );
}
