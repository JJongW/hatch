'use client';

import { Box, FlexBox, Tab, TabList, TabListItem, TabPanel } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';
import type { ReactNode } from 'react';

import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction } from '@/lib/summary';

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

/** 처음 여는 탭: 다음 행동이 가리키는 문서 → 내용 있는 마지막 문서 → 기획안 */
export function firstTab(docs: Doc[], next: NextAction): DocKey {
  if ('doc' in next) return next.doc;
  return docs.findLast((d) => d.content !== null)?.key ?? 'plan';
}

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
              <FlexBox alignItems="center" gap="6px" aria-label={`${doc.label} · ${LABELS[status]}`}>
                <Box
                  aria-hidden
                  sx={(theme: Theme) => ({ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor(status)(theme) })}
                />
                {doc.label}
              </FlexBox>
            </TabListItem>
          );
        })}
      </TabList>
      {docs.map((doc) => (
        <TabPanel key={doc.key} value={doc.key} mountMode="only-active" sx={{ paddingTop: '16px' }}>
          {render(doc)}
        </TabPanel>
      ))}
    </Tab>
  );
}
