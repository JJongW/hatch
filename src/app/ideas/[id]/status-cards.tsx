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

/** 현황 4칸: 문서, 확인 질문, 근거, 결정. 근거와 결정은 따로 센다 (spec 2026-11-03 §1). 누르면 그 탭 */
export default function StatusCards({ stats, onOpen }: Props) {
  const { docs, questions, decisions, evidence } = stats;
  const decisionCaption = [`안 정한 것 ${decisions.open}개`, decisions.proposed > 0 && `제안 ${decisions.proposed}개`, decisions.deferred > 0 && `보류 ${decisions.deferred}개`]
    .filter(Boolean)
    .join(', ');
  return (
    <Box
      as="section"
      aria-label="현황"
      // 휴대폰 폭에선 2칸씩 두 줄
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', '@media (max-width: 600px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } }}
    >
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
        title="근거"
        value={`${evidence.total}개`}
        caption={evidence.total > 0 ? `결정에 쓴 것 ${evidence.linked}개` : '확인한 사실'}
        onClick={() => onOpen('evidence')}
      />
      <Card title="결정" value={`${decisions.decided}개`} caption={decisionCaption} onClick={() => onOpen('decisions')} />
    </Box>
  );
}
