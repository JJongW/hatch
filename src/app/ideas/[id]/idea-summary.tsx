'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Button, FlexBox, respondMore, SectionHeader, Typography } from '@montage-ui/core';

import type { Decision, Doc, DocKey } from '@/lib/storage';
import type { NextAction, Summary } from '@/lib/summary';
import type { DecisionState } from '../../actions';
import Panel from '@/components/panel';
import { useDemo } from '../../_components/demo';
import DecisionForm from './decision-form';

type Props = {
  summary: Summary;
  docs: Doc[];
  ideaId: string;
  onOpenDoc: (key: DocKey) => void;
  saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  removeDecision: (decisionId: string) => Promise<void>;
  disabled: boolean;
};

type Opening = { kind: 'plan'; question: string } | { kind: 'edit'; id: string } | { kind: 'new' } | null;

// 넓으면 2열, 좁으면 1열
const gridStyle = { display: 'grid', gap: '12px', gridTemplateColumns: '1fr', [respondMore('768px')]: { gridTemplateColumns: '1fr 1fr' } };

const Cell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Panel>
    <SectionHeader size="xsmall" sx={{ marginBottom: '8px' }}>
      {title}
    </SectionHeader>
    {children}
  </Panel>
);

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
  <Typography as="h3" variant="caption1" weight="bold" color="semantic.foreground.neutral.tertiary" sx={{ display: 'block', marginBottom: '4px' }}>
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

function NextCell({ next, docs, ideaId, onOpenDoc }: { next: NextAction } & Pick<Props, 'docs' | 'ideaId' | 'onOpenDoc'>) {
  const label = (key: DocKey) => docs.find((d) => d.key === key)?.label ?? key;
  const open = (key: DocKey, title: string) => (
    <Button size="small" onClick={() => onOpenDoc(key)}>
      {title}
    </Button>
  );
  const go = (href: string, title: string) => (
    <Button as={Link} href={href} size="small">
      {title}
    </Button>
  );
  switch (next.kind) {
    case 'wait':
      return text(`${label(next.doc)} 만드는 중이에요.`);
    case 'check-stale':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text(`앞 문서가 바뀌어서 ${label(next.doc)} 내용이 예전 기준이에요.`)}
          {open(next.doc, `${label(next.doc)} 확인하기`)}
        </FlexBox>
      );
    case 'make-doc':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text(`다음으로 만들 문서: ${label(next.doc)}`)}
          {open(next.doc, `${label(next.doc)} 열기`)}
        </FlexBox>
      );
    case 'collect-voc':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text('모르는 것이 남았는데 고객 근거가 없어요. 고객 의견부터 모아 봐요.')}
          {go(`/tools/voc?idea=${ideaId}`, '고객 의견 정리하기')}
        </FlexBox>
      );
    case 'review-prd':
      return (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          {text('PRD를 아직 리뷰받지 않았어요.')}
          {go(`/tools/prd-review?idea=${ideaId}`, 'PRD 리뷰 받기')}
        </FlexBox>
      );
    case 'done':
      return text('문서가 모두 있어요. 바뀐 게 생기면 여기서 알려 줘요.');
  }
}

export default function IdeaSummary({ summary, docs, ideaId, onOpenDoc, saveDecision, removeDecision, disabled }: Props) {
  const { problem, evidence, unknowns, unknownTotal, decisions, next } = summary;
  const rest = unknownTotal - unknowns.length;
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
    <Box sx={gridStyle}>
      <Cell title="해결하려는 문제">{text(problem.text)}</Cell>
      <Cell title="확인된 근거와 모르는 것">
        <FlexBox flexDirection="column" gap="8px">
          {text(evidence.voc ? `고객 의견 ${evidence.voc.total}줄, 출발 순위 1번 ${evidence.voc.top}` : '아직 고객 근거가 없어요.')}
          {unknowns.length > 0 &&
            items([...unknowns.map((u) => `${u.label} ${u.count}곳`), ...(rest > 0 ? [`외 ${rest}개`] : [])])}
        </FlexBox>
      </Cell>
      {(hasDecisions || !demo) && (
        <Cell title="결정">
          <FlexBox flexDirection="column" gap="12px">
            {!hasDecisions && !demo && text('정할 게 생기면 여기에 남겨요.')}
            {open.length > 0 && (
              <Box>
                {sub('아직 안 정한 것')}
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
                {sub('정한 것과 보류한 것')}
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
        </Cell>
      )}
      <Cell title="추천 다음 행동">
        <NextCell next={next} docs={docs} ideaId={ideaId} onOpenDoc={onOpenDoc} />
      </Cell>
    </Box>
  );
}
