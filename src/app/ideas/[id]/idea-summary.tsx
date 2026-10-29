'use client';

import Link from 'next/link';
import { Box, Button, FlexBox, respondMore, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction, Summary } from '@/lib/summary';

type Props = { summary: Summary; docs: Doc[]; ideaId: string; onOpenDoc: (key: DocKey) => void };

const cellStyle = (theme: Theme) => ({
  border: `1px solid ${theme.semantic.line.neutral.primary}`,
  borderRadius: '12px',
  padding: '16px',
});

// 넓으면 2열, 좁으면 1열
const gridStyle = { display: 'grid', gap: '12px', gridTemplateColumns: '1fr', [respondMore('768px')]: { gridTemplateColumns: '1fr 1fr' } };

const Cell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={cellStyle}>
    <Typography as="h2" variant="label1" weight="bold" color="semantic.foreground.neutral.secondary" sx={{ marginBottom: '8px' }}>
      {title}
    </Typography>
    {children}
  </Box>
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

function NextCell({ next, docs, ideaId, onOpenDoc }: { next: NextAction } & Omit<Props, 'summary'>) {
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

export default function IdeaSummary({ summary, docs, ideaId, onOpenDoc }: Props) {
  const { problem, evidence, unknowns, unknownTotal, decisions, next } = summary;
  const rest = unknownTotal - unknowns.length;
  return (
    <Box sx={gridStyle}>
      <Cell title="해결하려는 문제">{text(problem.text)}</Cell>
      <Cell title="확인된 근거 · 모르는 것">
        <FlexBox flexDirection="column" gap="8px">
          {text(evidence.voc ? `고객 의견 ${evidence.voc.total}줄 · 출발 순위 1번 ${evidence.voc.top}` : '아직 고객 근거가 없어요.')}
          {unknowns.length > 0 &&
            items([...unknowns.map((u) => `${u.label} ${u.count}곳`), ...(rest > 0 ? [`외 ${rest}개`] : [])])}
        </FlexBox>
      </Cell>
      {decisions.length > 0 && <Cell title="지금 내려야 할 결정">{items(decisions)}</Cell>}
      <Cell title="추천 다음 행동">
        <NextCell next={next} docs={docs} ideaId={ideaId} onOpenDoc={onOpenDoc} />
      </Cell>
    </Box>
  );
}
