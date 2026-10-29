'use client';

import { Box, Tab, TabList, TabListItem, TabPanel, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';
import type { ReactNode } from 'react';

import type { Doc, DocKey } from '@/lib/storage';

type Status = 'has' | 'none' | 'stale' | 'running';

const LABELS: Record<Status, string> = { has: '있음', none: '아직 없음', stale: '앞 문서가 바뀜', running: '만드는 중' };

const statusOf = (doc: Doc, running: DocKey | null): Status =>
  running === doc.key ? 'running' : doc.content === null ? 'none' : doc.stale ? 'stale' : 'has';

const dotColor = (status: Status) => (theme: Theme) =>
  ({
    has: theme.semantic.foreground.brand.primary,
    none: theme.semantic.line.neutral.primary,
    stale: theme.semantic.foreground.cautionary.primary,
    running: theme.semantic.foreground.neutral.quaternary,
  })[status];

type Props = {
  docs: Doc[];
  running: DocKey | null;
  value: DocKey;
  onChange: (key: DocKey) => void;
  render: (doc: Doc) => ReactNode;
};

export default function DocTabs({ docs, running, value, onChange, render }: Props) {
  return (
    <Tab value={value} onValueChange={(v) => onChange(v as DocKey)}>
      <TabList size="medium" resize="hug">
        {docs.map((doc) => {
          const status = statusOf(doc, running);
          return (
            <TabListItem key={doc.key} value={doc.key}>
              <Box as="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Box
                  as="span"
                  aria-hidden
                  sx={(theme: Theme) => ({ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor(status)(theme) })}
                />
                {doc.label}
                <Typography as="span" variant="caption2" color="semantic.foreground.neutral.tertiary">
                  {LABELS[status]}
                </Typography>
              </Box>
            </TabListItem>
          );
        })}
      </TabList>
      {docs.map((doc) => (
        <TabPanel key={doc.key} value={doc.key} sx={{ paddingTop: '16px' }}>
          {render(doc)}
        </TabPanel>
      ))}
    </Tab>
  );
}
