'use client';

import { Accordion, AccordionDetails, AccordionSummary, Box, Typography, type Theme } from '@montage-ui/core';

import { diffSummary, lineDiff, type DiffSummary } from '@/lib/diff';

import { formatKst } from './format-kst';
export { formatKst as formatWhen };

/** "바뀐 절: 목표 · 새 절: 근거 · 더한 줄 3, 뺀 줄 1" */
export function summaryLine(s: DiffSummary): string {
  if (s.added === 0 && s.removed === 0) return '내용이 같아요.';
  return [
    s.changed.length > 0 && `바뀐 절: ${s.changed.join(', ')}`,
    s.addedSections.length > 0 && `새 절: ${s.addedSections.join(', ')}`,
    s.removedSections.length > 0 && `없어진 절: ${s.removedSections.join(', ')}`,
    `더한 줄 ${s.added}, 뺀 줄 ${s.removed}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

// 색 대신 기호와 취소선으로 구분한다 (빨강 · 초록을 쓰지 않는 화면 규칙). 같은 줄은 흐리게
const lineSx = (kind: 'same' | 'add' | 'del') => (t: Theme) => ({
  display: 'block',
  whiteSpace: 'pre-wrap' as const,
  padding: '1px 8px',
  borderLeft: `2px solid ${kind === 'same' ? 'transparent' : t.semantic.foreground.neutral.primary}`,
  color: kind === 'same' ? t.semantic.foreground.neutral.secondary : t.semantic.foreground.neutral.primary,
  textDecoration: kind === 'del' ? 'line-through' : 'none',
  fontWeight: kind === 'add' ? 600 : 400,
});

/** 요약 한 줄 + 접힌 줄 단위 비교. before = 지금 판, after = 비교할 판 */
export default function DiffView({ before, after, title = '줄 단위로 비교 보기' }: { before: string; after: string; title?: string }) {
  const lines = lineDiff(before, after);
  return (
    <Box>
      <Typography variant="body2" sx={{ display: 'block' }}>
        {summaryLine(diffSummary(before, after))}
      </Typography>
      <Accordion divider={false}>
        <AccordionSummary>{title}</AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxHeight: '360px', overflow: 'auto' }} aria-label="줄 단위 비교">
            {lines.map((l, i) => (
              <Typography key={i} as="span" variant="caption1" sx={lineSx(l.kind)}>
                <span aria-label={l.kind === 'add' ? '더한 줄' : l.kind === 'del' ? '뺀 줄' : undefined}>{l.kind === 'add' ? '+ ' : l.kind === 'del' ? '− ' : '  '}</span>
                {l.text || ' '}
              </Typography>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
