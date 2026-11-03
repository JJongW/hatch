'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FlexBox,
  List,
  ListCell,
  ListCellContent,
  SectionMessage,
  TextButton,
  Typography,
} from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import DecisionForm from './decision-form';
import EvidenceForm from './evidence-form';

import type { QuestionLine, QuestionView } from '@/lib/summary';
import type { DecisionState, EvidenceState, QuestionsState } from '../../actions';

type Props = {
  view: QuestionView;
  action: () => Promise<QuestionsState>;
  /** 결정 적기 폼의 저장 액션 (decisionId는 새 결정이라 null로 바인딩해 넘긴다) */
  saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  /** 답 적기(근거) 폼의 저장 액션 (evidenceId는 새 근거라 null) */
  saveEvidence: (evidenceId: string | null, prev: EvidenceState, formData: FormData) => Promise<EvidenceState>;
  /** 만드는 동안 다른 저장 · 생성 버튼을 막도록 위에 알린다 */
  onBusy: (busy: boolean) => void;
  /** 문서 생성 · 질문 만들기 중이면 막는다 */
  disabled: boolean;
  /** 결정 탭에 폼이 열려 있으면 답 적기를 숨긴다 (폼은 화면 전체에서 하나) */
  locked: boolean;
  /** 답 적기 폼을 열고 닫을 때 위에 알린다 */
  onForm: (open: boolean) => void;
};

const text = (t: string) => (
  <Typography as="p" variant="body2" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

const caption = (t: string) => (
  <Typography as="span" variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

// 질문 한 줄: 질문, 아래에 출처 라벨, 오른쪽에 답 적기. 답 적기 폼은 그 줄 아래에 (ListCell 안에 넣으면 눌림 효과 층이 폼을 덮는다)
function Lines({ list, aside, below }: { list: QuestionLine[]; aside: (q: QuestionLine) => React.ReactNode; below: (q: QuestionLine) => React.ReactNode }) {
  return (
    <List flexDirection="column" sx={{ width: '100%' }}>
      {list.map((q) => {
        const button = aside(q);
        const form = below(q);
        return (
          <Box as="li" key={q.label}>
            <ListCell
              as="div"
              disableInteraction
              verticalPadding="small"
              textProps={{ description: `${q.label} (${q.count}곳)` }}
              trailingContent={button && <ListCellContent variant="button">{button}</ListCellContent>}
            >
              {q.question}
            </ListCell>
            {form}
          </Box>
        );
      })}
    </List>
  );
}

type Writing = 'evidence' | 'decision';
// 고객 · 담당자 질문의 답은 근거, 팀이 정할 것의 답은 결정 (spec 2026-11-03 §1)
const writingOf = (q: QuestionLine): Writing => (q.kind === 'decision' ? 'decision' : 'evidence');

export default function QuestionsPanel({ view, action, saveDecision, saveEvidence, onBusy, disabled, locked, onForm }: Props) {
  const demo = useDemo();
  // 한 번에 폼 하나 (결정 칸과 같은 규칙). 열어 둔 질문의 라벨과 어느 쪽으로 적는지
  const [opening, setOpening] = useState<{ label: string; as: Writing } | null>(null);
  // 근거를 저장한 뒤 '이 근거로 결정을 내릴까요?' (그 질문은 답한 것으로 목록에서 빠지므로 목록 밖에 띄운다)
  const [follow, setFollow] = useState<{ evidenceId: string; question: string; open: boolean } | null>(null);
  const [state, formAction, pending] = useActionState(async (): Promise<QuestionsState> => action(), {});
  // 액션 안에서 바꾼 상태는 transition이 끝나야 반영되므로, pending을 보고 위에 알린다
  useEffect(() => onBusy(pending), [pending, onBusy]);
  // 두 패널은 force-mount라 사라지지 않는다. 조건부 렌더로 바꾸면 언마운트 때 onForm(false) 정리를 넣는다
  useEffect(() => onForm(opening !== null || !!follow?.open), [opening, follow, onForm]);
  if (!view.made && (demo || view.labelTotal === 0)) return text('확인할 질문이 아직 없어요.');

  const answer = (q: QuestionLine) =>
    !demo &&
    !locked &&
    opening === null &&
    !follow?.open && (
      <Button
        size="small"
        variant="outlined"
        color="assistive"
        // 다른 질문을 열면 '이 근거로 결정을…' 안내는 닫는다 (폼은 화면 전체에서 하나)
        onClick={() => {
          setFollow(null);
          setOpening({ label: q.label, as: writingOf(q) });
        }}
        disabled={disabled}
      >
        {writingOf(q) === 'decision' ? '결정 적기' : '답 적기'}
      </Button>
    );
  // 질문 종류가 맞지 않을 때 다른 쪽으로 적는 보조 버튼
  const swap = (q: QuestionLine, to: Writing) => (
    <TextButton size="small" onClick={() => setOpening({ label: q.label, as: to })} sx={{ alignSelf: 'flex-start', marginTop: '4px' }}>
      {to === 'decision' ? '팀이 정할 일이면 결정으로 적기' : '확인한 사실이면 근거로 적기'}
    </TextButton>
  );
  const form = (q: QuestionLine) => {
    if (opening?.label !== q.label) return null;
    const close = () => setOpening(null);
    return opening.as === 'evidence' ? (
      <FlexBox flexDirection="column">
        <EvidenceForm
          question={q.question}
          defaultSource={q.kind === 'owner' ? 'teammate' : 'interview'}
          action={saveEvidence.bind(null, null)}
          onSaved={(evidenceId) => {
            close();
            setFollow({ evidenceId, question: q.question, open: false });
          }}
          onClose={close}
          disabled={disabled}
        />
        {swap(q, 'decision')}
      </FlexBox>
    ) : (
      <FlexBox flexDirection="column">
        <DecisionForm question={q.question} from="question" action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />
        {swap(q, 'evidence')}
      </FlexBox>
    );
  };

  // 묶음 하나. 접어도 폼 상태는 남게 마운트해 두고, 열린 폼이 있는 묶음을 접으면 폼을 닫는다
  // (안 닫으면 폼은 안 보이는데 두 탭의 버튼이 모두 숨은 채로 남는다)
  const group = (key: string, title: string, expanded: boolean, list: QuestionLine[]) => (
    <Accordion
      key={key}
      defaultExpanded={expanded}
      divider
      onChange={(open) => {
        if (!open && list.some((q) => q.label === opening?.label)) setOpening(null);
      }}
    >
      <AccordionSummary>{title}</AccordionSummary>
      <AccordionDetails forceMount>
        <Lines list={list} aside={answer} below={form} />
      </AccordionDetails>
    </Accordion>
  );

  const make = (label: string) => (
    <form action={formAction}>
      <Button type="submit" size="small" loading={pending} disabled={disabled}>
        {label}
      </Button>
    </form>
  );
  // 질문으로 만들지 않은 [확인 필요]: 이름 없이 표시만 있는 곳, 개수 상한을 넘은 것
  const skipped = [
    view.unnamed > 0 ? `이름 없이 [확인 필요]만 적힌 ${view.unnamed}곳은 질문으로 만들지 않았어요.` : '',
    view.cut > 0 ? `질문이 많아 ${view.limit + 1}번째부터 ${view.cut}개는 뺐어요.` : '',
  ].filter(Boolean);

  return (
    <Box>
      <FlexBox flexDirection="column" gap="12px" alignItems="flex-start">
        {!view.made ? (
          <>
            {text(`[확인 필요] ${view.unknownTotal}곳(이름 ${view.labelTotal}가지)을 고객에게 물을 것, 담당자에게 확인할 것, 팀이 정할 것으로 나눠요. 1분쯤 걸려요.`)}
            {make('질문 목록 만들기')}
          </>
        ) : (
          <>
            {/* 묶음마다 접기. 고객 묶음만 처음 펼침 (spec detail-dashboard §2 탭 안) */}
            {follow && (
              <Box sx={(t: Theme) => ({ width: '100%', border: `1px solid ${t.semantic.line.neutral.primary}`, borderRadius: '12px', padding: '12px 16px' })}>
                {follow.open ? (
                  <DecisionForm
                    defaultQuestion={follow.question}
                    evidenceIds={[follow.evidenceId]}
                    defaultStatus="proposed"
                    action={saveDecision.bind(null, null)}
                    onClose={() => setFollow(null)}
                    disabled={disabled}
                  />
                ) : (
                  <FlexBox alignItems="center" gap="8px" sx={{ flexWrap: 'wrap' }} role="status">
                    <Typography variant="body2">근거를 저장했어요. 이 근거로 어떤 결정을 내릴까요?</Typography>
                    <Button size="small" onClick={() => setFollow({ ...follow, open: true })} disabled={disabled || locked || opening !== null}>
                      결정 적기
                    </Button>
                    <Button size="small" variant="outlined" color="assistive" onClick={() => setFollow(null)}>
                      나중에
                    </Button>
                  </FlexBox>
                )}
              </Box>
            )}
            {view.first.length > 0 && (
              <Box sx={{ width: '100%' }}>
                <Typography variant="label1" weight="bold" sx={{ display: 'block' }}>
                  먼저 볼 것 {view.first.length}개
                </Typography>
                {caption('팀이 정할 것 먼저, 그다음 [확인 필요]가 걸린 곳이 많은 순이에요.')}
                <Lines list={view.first} aside={answer} below={form} />
              </Box>
            )}
            {(view.customer.length > 0 || view.owner.length > 0 || view.decision.length > 0) && (
              <Accordion divider={false} onChange={(open) => !open && opening && !view.first.some((q) => q.label === opening.label) && setOpening(null)}>
                <AccordionSummary>{`나머지 ${view.openTotal - view.first.length}개 보기`}</AccordionSummary>
                <AccordionDetails forceMount>
                  {view.customer.length > 0 && group('customer', `고객에게 물을 것 ${view.customer.length}개`, true, view.customer)}
                  {view.owner.map((g) => group(g.role, `${g.role} 담당자에게 확인할 것 ${g.items.length}개`, false, g.items))}
                  {view.decision.length > 0 && group('decision', `팀이 정할 것 ${view.decision.length}개`, false, view.decision)}
                </AccordionDetails>
              </Accordion>
            )}
            {view.openTotal === 0 && text('남은 질문이 없어요.')}
            {view.answered > 0 &&
              caption(
                `답한 것 ${view.answered}개 — ${[view.byEvidence > 0 && `근거 ${view.byEvidence}개는 문제와 근거 탭`, view.byDecision > 0 && `결정 ${view.byDecision}개는 결정 탭`].filter(Boolean).join(', ')}에 있어요.`,
              )}
            {view.newLabels > 0 && (
              <FlexBox alignItems="center" gap="8px">
                {text(`질문을 만든 뒤 문서에 새 [확인 필요]가 ${view.newLabels}개 생겼어요.`)}
                {!demo && make('질문 다시 만들기')}
              </FlexBox>
            )}
          </>
        )}
        {skipped.length > 0 && caption(skipped.join(' '))}
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
      </FlexBox>
    </Box>
  );
}
