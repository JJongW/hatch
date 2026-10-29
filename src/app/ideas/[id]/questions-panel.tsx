'use client';

import { useActionState, useEffect, useState } from 'react';
import { Box, Button, FlexBox, SectionMessage, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import SectionTitle from '../../_components/section-title';
import DecisionForm from './decision-form';

import type { QuestionLine, QuestionView } from '@/lib/summary';
import type { DecisionState, QuestionsState } from '../../actions';

type Props = {
  view: QuestionView;
  action: () => Promise<QuestionsState>;
  /** 답 적기 폼의 저장 액션 (decisionId는 새 결정이라 null로 바인딩해 넘긴다) */
  saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  /** 만드는 동안 다른 저장 · 생성 버튼을 막도록 위에 알린다 */
  onBusy: (busy: boolean) => void;
  /** 문서 생성 · 질문 만들기 중이면 막는다 */
  disabled: boolean;
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

const sub = (t: string) => (
  <Typography as="h3" variant="label1" weight="bold" sx={{ display: 'block', marginBottom: '4px' }}>
    {t}
  </Typography>
);

function Lines({ list, aside, below }: { list: QuestionLine[]; aside: (q: QuestionLine) => React.ReactNode; below: (q: QuestionLine) => React.ReactNode }) {
  return (
    <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
      {list.map((q) => (
        <li key={q.label}>
          <FlexBox justifyContent="space-between" alignItems="flex-start" gap="8px">
            <span>
              {q.question}
              {caption(`${q.label} · ${q.count}곳`)}
            </span>
            {aside(q)}
          </FlexBox>
          {below(q)}
        </li>
      ))}
    </Typography>
  );
}

export default function QuestionsPanel({ view, action, saveDecision, onBusy, disabled }: Props) {
  const demo = useDemo();
  // 한 번에 폼 하나 (결정 칸과 같은 규칙). 값은 열어 둔 질문의 라벨
  const [opening, setOpening] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(async (): Promise<QuestionsState> => action(), {});
  // 액션 안에서 바꾼 상태는 transition이 끝나야 반영되므로, pending을 보고 위에 알린다
  useEffect(() => onBusy(pending), [pending, onBusy]);
  if (!view.made && (demo || view.labelTotal === 0)) return null;

  const answer = (q: QuestionLine) =>
    !demo &&
    opening === null && (
      <Button size="small" variant="outlined" color="assistive" onClick={() => setOpening(q.label)} disabled={disabled}>
        답 적기
      </Button>
    );
  const form = (q: QuestionLine) =>
    opening === q.label && (
      <DecisionForm question={q.question} from="question" action={saveDecision.bind(null, null)} onClose={() => setOpening(null)} disabled={disabled} />
    );

  const make = (label: string) => (
    <form action={formAction}>
      <Button type="submit" size="small" loading={pending} disabled={disabled}>
        {label}
      </Button>
    </form>
  );
  const ownerCount = view.owner.reduce((n, g) => n + g.items.length, 0);
  const skipped = [
    view.unnamed > 0 ? `라벨 없는 표시 ${view.unnamed}곳` : '',
    view.cut > 0 ? `${view.limit + 1}번째부터 ${view.cut}개` : '',
  ].filter(Boolean);

  return (
    <Box>
      <SectionTitle>확인 질문</SectionTitle>
      <FlexBox flexDirection="column" gap="12px" alignItems="flex-start">
        {!view.made ? (
          <>
            {text(`[확인 필요] ${view.unknownTotal}곳 · 라벨 ${view.labelTotal}개를 고객에게 물을 것과 담당자에게 확인할 것으로 나눠요. 1분쯤 걸려요.`)}
            {make('질문 목록 만들기')}
          </>
        ) : (
          <>
            {view.customer.length > 0 && (
              <Box>
                {sub(`고객에게 물을 것 (${view.customer.length})`)}
                <Lines list={view.customer} aside={answer} below={form} />
              </Box>
            )}
            {view.owner.length > 0 && (
              <Box>
                {sub(`담당자에게 확인할 것 (${ownerCount})`)}
                {view.owner.map((g) => (
                  <Box key={g.role} sx={{ marginTop: '4px' }}>
                    {caption(g.role)}
                    <Lines list={g.items} aside={answer} below={form} />
                  </Box>
                ))}
              </Box>
            )}
            {view.customer.length === 0 && view.owner.length === 0 && text('남은 질문이 없어요.')}
            {view.answered > 0 && caption(`답한 것 ${view.answered}개 — 결정 칸에 있어요.`)}
            {view.newLabels > 0 && (
              <FlexBox alignItems="center" gap="8px">
                {text(`새로 생긴 확인 필요 ${view.newLabels}개`)}
                {!demo && make('다시 만들기')}
              </FlexBox>
            )}
          </>
        )}
        {skipped.length > 0 && caption(`질문에서 빠진 것: ${skipped.join(' · ')}`)}
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
      </FlexBox>
    </Box>
  );
}
