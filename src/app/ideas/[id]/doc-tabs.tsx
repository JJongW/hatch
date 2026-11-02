'use client';

import { Box, ContentBadge, FlexBox, ListCell, ListCellContent, Tab, TabList, TabListItem, TabPanel, Typography, useMediaQuery } from '@montage-ui/core';
import { IconCheck } from '@montage-ui/icon';

import { highlightSx } from '@/lib/theme/tokens';

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

// 세로 목록의 상태 배지. 완료도 흐리지 않게 (spec detail-dashboard §1)
// 바뀜은 주의 배지(옐로 배경 + 잉크 글자), 만드는 중과 다음 차례는 코발트 테두리 (spec color-system 5절)
const ACCENT: Partial<Record<DocStatus, 'semantic.foreground.brand.primary'>> = {
  running: 'semantic.foreground.brand.primary',
  next: 'semantic.foreground.brand.primary',
};

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === 'stale') {
    return (
      <ContentBadge size="xsmall" variant="solid" sx={highlightSx}>
        {LABELS[status]}
      </ContentBadge>
    );
  }
  const accent = ACCENT[status];
  return (
    <ContentBadge size="xsmall" variant="outlined" color={accent ? 'accent' : 'neutral'} accentColor={accent}>
      {LABELS[status]}
    </ContentBadge>
  );
}

// 상태 표시: 완료는 체크, 바뀜은 잉크 점, 만드는 중은 깜빡이는 코발트 점, 다음 차례는 코발트 원, 대기는 슬레이트 원 (spec chain-progress §2).
// 옐로 점은 밝은 배경 위 1.39라 쓰지 않는다. 모양과 옆 글자 라벨로 구분한다
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
  const { breakpoint, respondMore } = useMediaQuery();
  // 넓은 화면은 왼쪽 세로 목록 + 오른쪽 본문, 좁으면 가로 탭 (spec detail-dashboard §2 탭 안).
  // 왼쪽 네비가 폭을 차지해 spec의 1024px 대신 Montage lg(1200px)에서 나눈다
  const wide = respondMore(breakpoint.lg);
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
      <Box sx={{ [wide]: { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: '24px', alignItems: 'start' } }}>
        <FlexBox as="nav" aria-label="문서" flexDirection="column" sx={{ display: 'none', [wide]: { display: 'flex' } }}>
          {docs.map((doc) => (
            <ListCell
              key={doc.key}
              as="button"
              type="button"
              aria-current={value === doc.key ? 'true' : undefined}
              selected={value === doc.key}
              verticalPadding="small"
              onClick={() => onChange(doc.key)}
              trailingContent={
                <ListCellContent variant="content-badge">
                  <StatusBadge status={progress.status[doc.key]} />
                </ListCellContent>
              }
            >
              {doc.label}
            </ListCell>
          ))}
        </FlexBox>
        <Tab value={value} onValueChange={(v) => onChange(v as DocKey)}>
          <TabList size="medium" resize="hug" sx={{ [wide]: { display: 'none' } }}>
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
            <TabPanel key={doc.key} value={doc.key} sx={{ paddingTop: '16px', animation: 'hatch-fade 200ms ease-out both', [wide]: { paddingTop: 0 } }}>
              {render(doc)}
            </TabPanel>
          ))}
        </Tab>
      </Box>
    </>
  );
}
