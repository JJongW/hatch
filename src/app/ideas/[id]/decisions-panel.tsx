'use client';

import { useState } from 'react';
import { Box, Button, FlexBox, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import DecisionForm from './decision-form';

import type { Decision } from '@/lib/storage';
import type { Summary } from '@/lib/summary';
import type { DecisionState } from '../../actions';

type Props = {
  decisions: Summary['decisions'];
  saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  removeDecision: (decisionId: string) => Promise<void>;
  disabled: boolean;
};

type Opening = { kind: 'plan'; question: string } | { kind: 'edit'; id: string } | { kind: 'new' } | null;

const text = (t: React.ReactNode) => (
  <Typography as="p" variant="body2" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

const items = (list: React.ReactNode[]) => (
  <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
    {list.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </Typography>
);

const sub = (t: string) => (
  <Typography as="h3" variant="label1" weight="bold" sx={{ display: 'block', marginBottom: '4px' }}>
    {t}
  </Typography>
);

function DecisionLine({ d }: { d: Decision }) {
  return (
    <>
      {d.status === 'decided' ? `${d.question} → ${d.answer}` : `${d.question} (보류)`}
      <Typography as="span" variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block' }}>
        {d.status === 'decided' ? '이유' : '보류 이유'}: {d.reason}
      </Typography>
    </>
  );
}

/** 결정 탭 (spec detail-dashboard §2-4). 줄 모양은 2b(#92)에서 ListCell로 */
export default function DecisionsPanel({ decisions, saveDecision, removeDecision, disabled }: Props) {
  const { open, openMore, recorded } = decisions;
  const hasDecisions = open.length > 0 || recorded.length > 0;
  const demo = useDemo();
  const [opening, setOpening] = useState<Opening>(null);
  const close = () => setOpening(null);
  const outlined = (label: string, onClick: () => void) => (
    <Button size="small" variant="outlined" color="assistive" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
  return (
    <FlexBox flexDirection="column" gap="20px">
      {!hasDecisions && text(demo ? '아직 남긴 결정이 없어요.' : '정할 게 생기면 여기에 남겨요.')}
      {open.length > 0 && (
        <Box>
          {sub(`아직 안 정한 것 (${open.length + openMore})`)}
          {items([
            ...open.map((q) => (
              <>
                <FlexBox justifyContent="space-between" alignItems="flex-start" gap="8px">
                  <span>{q}</span>
                  {!demo && opening === null && outlined('정하기', () => setOpening({ kind: 'plan', question: q }))}
                </FlexBox>
                {opening?.kind === 'plan' && opening.question === q && (
                  <DecisionForm question={q} action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />
                )}
              </>
            )),
            ...(openMore > 0 ? [`외 ${openMore}개`] : []),
          ])}
        </Box>
      )}
      {recorded.length > 0 && (
        <Box>
          {sub(`정한 것과 보류한 것 (${recorded.length})`)}
          {items(
            recorded.map((d) => (
              <>
                <FlexBox justifyContent="space-between" alignItems="flex-start" gap="8px">
                  <span>
                    <DecisionLine d={d} />
                  </span>
                  {!demo && opening === null && (
                    <FlexBox gap="4px">
                      {outlined('수정', () => setOpening({ kind: 'edit', id: d.id }))}
                      <form
                        action={() => removeDecision(d.id)}
                        onSubmit={(e) => {
                          if (!window.confirm('이 결정을 지울까요? 이전 판은 .history에 남아요.')) e.preventDefault();
                        }}
                      >
                        <Button type="submit" size="small" variant="outlined" color="assistive" disabled={disabled}>
                          지우기
                        </Button>
                      </form>
                    </FlexBox>
                  )}
                </FlexBox>
                {opening?.kind === 'edit' && opening.id === d.id && (
                  <DecisionForm initial={d} action={saveDecision.bind(null, d.id)} onClose={close} disabled={disabled} />
                )}
              </>
            )),
          )}
        </Box>
      )}
      {!demo &&
        (opening?.kind === 'new' ? (
          <DecisionForm action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />
        ) : (
          opening === null && <Box>{outlined('결정 직접 추가', () => setOpening({ kind: 'new' }))}</Box>
        ))}
    </FlexBox>
  );
}
