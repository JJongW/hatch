'use client';

import { addOpacity, Box, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import { panelStyle } from '@/components/panel';

import type { DetailStats } from './detail-stats';

export type DetailTab = 'docs' | 'questions' | 'decisions' | 'evidence';

type Props = { stats: DetailStats; onOpen: (tab: DetailTab) => void };

// 칸 전체가 버튼. 3칸은 휴대폰 폭에서도 한 줄 (숫자 + 짧은 캡션)
const cardStyle = (t: Theme) => ({
  width: '100%',
  height: '100%',
  textAlign: 'left' as const,
  font: 'inherit',
  color: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
  '&:hover': { background: addOpacity(t.semantic.foreground.neutral.primary, t.opacity[5]) }, // 색 대신 본문색 5% 틴트 (#103)
  '&:focus-visible': { outline: `2px solid ${t.semantic.foreground.brand.primary}`, outlineOffset: '2px' },
});

function Card({ title, value, caption, onClick }: { title: string; value: string; caption: string; onClick: () => void }) {
  return (
    <Box as="button" type="button" onClick={onClick} sx={[panelStyle(false), cardStyle]}>
      <Typography as="span" variant="label1" weight="bold" color="semantic.foreground.neutral.secondary" sx={{ display: 'block' }}>
        {title}
      </Typography>
      <Typography as="span" variant="title3" weight="bold" sx={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography as="span" variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block' }}>
        {caption}
      </Typography>
    </Box>
  );
}

/** 현황 3칸: 문서, 확인 질문, 결정. 누르면 그 탭 (spec detail-dashboard §2-3) */
export default function StatusCards({ stats, onOpen }: Props) {
  const { docs, questions, decisions } = stats;
  return (
    <Box as="section" aria-label="현황" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
      <Card
        title="문서"
        value={`${docs.done} / ${docs.total}`}
        caption={docs.stale > 0 ? `다시 볼 것 ${docs.stale}개` : docs.done === docs.total ? '모두 최신' : `남은 것 ${docs.total - docs.done}개`}
        onClick={() => onOpen('docs')}
      />
      <Card
        title="확인 질문"
        value={questions.made ? `${questions.open}개` : `${questions.unknownTotal}곳`}
        caption={questions.made ? `답한 것 ${questions.answered}개` : '[확인 필요] 표시'}
        onClick={() => onOpen('questions')}
      />
      <Card
        title="결정"
        value={`${decisions.decided}개`}
        caption={`안 정한 것 ${decisions.open}개${decisions.deferred > 0 ? `, 보류 ${decisions.deferred}개` : ''}`}
        onClick={() => onOpen('decisions')}
      />
    </Box>
  );
}
