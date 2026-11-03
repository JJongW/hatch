'use client';

import { Box, ContentBadge, FlexBox, ListCell, ListCellContent, Tab, TabList, TabListItem, TabPanel, Typography, useMediaQuery } from '@montage-ui/core';
import { IconCheck } from '@montage-ui/icon';

import { highlightSx } from '@/lib/theme/tokens';

import type { Theme } from '@montage-ui/core';
import type { ReactNode } from 'react';

import type { Doc, DocKey } from '@/lib/storage';

import { chainProgress, summaryLine, type DocStatus } from './chain-progress';
import { changeBadge } from './doc-changes';

const LABELS: Record<DocStatus, string> = {
  running: '만드는 중',
  stale: '검토 필요', // 실제 원인은 labelOf가 문서의 changes로 바꿔 쓴다
  done: '완료',
  next: '다음 차례',
  wait: '대기',
};

const MARK = '12px';

// 세로 목록의 상태 배지. 완료도 흐리지 않게 (spec detail-dashboard §1)
// 바뀜은 주의 배지(라일락 배경 + 검정 글자), 만드는 중과 다음 차례는 주색(검정) 테두리 (spec mono-montage 2절)
const ACCENT: Partial<Record<DocStatus, 'semantic.foreground.brand.primary'>> = {
  running: 'semantic.foreground.brand.primary',
  next: 'semantic.foreground.brand.primary',
};

/** 바뀐 문서는 실제 원인(근거 추가됨 · 결정 바뀜 …), 새 판이 있으면 '새 판 있음' */
const labelOf = (status: DocStatus, doc: Doc) =>
  (status === 'stale' || status === 'done') && doc.draft
    ? '새 판 있음'
    : status !== 'stale'
      ? LABELS[status]
      : doc.changes[0]
        ? changeBadge(doc.changes[0], doc)
        : LABELS.stale;

function StatusBadge({ status, doc }: { status: DocStatus; doc: Doc }) {
  if (status === 'stale') {
    return (
      <ContentBadge size="xsmall" variant="solid" sx={highlightSx}>
        {labelOf(status, doc)}
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

// 상태 표시: 완료는 체크, 바뀜은 점, 만드는 중은 깜빡이는 점, 다음 차례는 진한 원, 대기는 옅은 원 (spec chain-progress §2).
// 색은 모두 무채색이라 모양과 옆 글자 라벨로 구분한다. 진행 줄 모션은 #107 모션 PR에서 다시 본다
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
              // button으로 바꾸면 브라우저 기본 버튼 배경(회색)이 남는다. 줄 모양은 ListCell이 맡는다
              // 주색이 본문색과 같은 검정이라 ListCell의 선택 글자색만으로는 안 보인다 → 고른 줄은 굵게
              sx={{ backgroundColor: 'transparent', textAlign: 'left', '&[aria-current="true"]': { fontWeight: 700 } }}
              onClick={() => onChange(doc.key)}
              trailingContent={
                <ListCellContent variant="content-badge">
                  <StatusBadge status={progress.status[doc.key]} doc={doc} />
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
                      {labelOf(status, doc)}
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
