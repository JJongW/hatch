'use client';

import { Box, Tab, TabList, TabListItem, TabPanel, Typography } from '@montage-ui/core';
import { IconCheck } from '@montage-ui/icon';

import type { Theme } from '@montage-ui/core';
import type { ReactNode } from 'react';

import type { Doc, DocKey } from '@/lib/storage';

import { chainProgress, summaryLine, type DocStatus } from './chain-progress';

const LABELS: Record<DocStatus, string> = {
  running: '만드는 중',
  stale: '앞 문서가 바뀜',
  done: '완료',
  next: '다음 차례',
  wait: '대기',
};

const MARK = '12px';

// 상태 표시: 완료는 체크, 바뀜은 주황 점, 만드는 중은 깜빡이는 파란 점, 다음 차례는 파란 원, 대기는 회색 원 (spec chain-progress §2)
function StatusMark({ status }: { status: DocStatus }) {
  if (status === 'done') {
    return <IconCheck aria-hidden sx={(t: Theme) => ({ width: MARK, height: MARK, color: t.semantic.foreground.brand.primary })} />;
  }
  return (
    <Box
      as="span"
      aria-hidden
      sx={(t: Theme) => {
        const brand = t.semantic.foreground.brand.primary;
        const base = { display: 'inline-block', boxSizing: 'border-box' as const, borderRadius: '50%' };
        if (status === 'running') return { ...base, width: '8px', height: '8px', margin: '2px', backgroundColor: brand, animation: 'hatch-pulse 1.2s ease-in-out infinite alternate' };
        if (status === 'stale') return { ...base, width: '8px', height: '8px', margin: '2px', backgroundColor: t.semantic.foreground.cautionary.primary };
        const ring = status === 'next' ? brand : t.semantic.foreground.neutral.tertiary;
        return { ...base, width: '10px', height: '10px', margin: '1px', border: `1.5px solid ${ring}` };
      }}
    />
  );
}

type Props = {
  docs: Doc[];
  running: DocKey | null;
  value: DocKey;
  onChange: (key: DocKey) => void;
  render: (doc: Doc) => ReactNode;
};

export default function DocTabs({ docs, running, value, onChange, render }: Props) {
  const progress = chainProgress(docs, running);
  return (
    <>
      <Typography
        variant="body2"
        color="semantic.foreground.neutral.secondary"
        aria-live="polite"
        sx={{ display: 'block', marginBottom: '8px' }}
      >
        {summaryLine(progress, docs, running)}
      </Typography>
      <Tab value={value} onValueChange={(v) => onChange(v as DocKey)}>
        <TabList size="medium" resize="hug">
          {docs.map((doc) => {
            const status = progress.status[doc.key];
            return (
              <TabListItem key={doc.key} value={doc.key}>
                <Box as="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <StatusMark status={status} />
                  {doc.label}
                  <Typography
                    as="span"
                    variant="caption2"
                    color={status === 'next' ? 'semantic.foreground.brand.primary' : 'semantic.foreground.neutral.secondary'}
                  >
                    {LABELS[status]}
                  </Typography>
                </Box>
              </TabListItem>
            );
          })}
        </TabList>
        {docs.map((doc) => (
          <TabPanel key={doc.key} value={doc.key} sx={{ paddingTop: '16px', animation: 'hatch-fade 200ms ease-out both' }}>
            {render(doc)}
          </TabPanel>
        ))}
      </Tab>
    </>
  );
}
