'use client';

import { Box, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import type { CompareRow } from '@/lib/tools/prd-review/compute';

const MAX = 5;

const cell = (t: Theme) => ({ padding: '8px 6px', borderTop: `1px solid ${t.semantic.line.neutral.primary}`, verticalAlign: 'middle' as const });
const head = (t: Theme) => ({ padding: '0 6px 8px', textAlign: 'left' as const, fontWeight: 600, whiteSpace: 'nowrap' as const, color: t.semantic.foreground.neutral.secondary });
const num = (n: number | null) => (n === null ? '응답 없음' : n.toFixed(1));

// 이전은 옅은 막대, 지금은 진한 막대를 겹친다. 숫자 칸이 같은 정보를 주므로 aria-hidden
function Bar({ before, now }: Pick<CompareRow, 'before' | 'now'>) {
  const width = (n: number | null) => `${((n ?? 0) / MAX) * 100}%`;
  return (
    <Box
      aria-hidden
      sx={(t: Theme) => ({ position: 'relative', height: '8px', minWidth: '80px', borderRadius: '4px', backgroundColor: t.semantic.background.neutral.secondary })}
    >
      {before !== null && (
        <Box sx={(t: Theme) => ({ position: 'absolute', inset: '0 auto 0 0', width: width(before), borderRadius: '4px', backgroundColor: t.semantic.line.neutral.primary })} />
      )}
      {now !== null && (
        <Box sx={(t: Theme) => ({ position: 'absolute', top: '2px', left: 0, height: '4px', width: width(now), borderRadius: '4px', backgroundColor: t.semantic.foreground.brand.primary })} />
      )}
    </Box>
  );
}

// 색만으로 구분하지 않게 기호와 글자를 같이 쓴다
function Delta({ delta }: Pick<CompareRow, 'delta'>) {
  if (delta === null) return null;
  const [text, color] =
    delta > 0
      ? ([`▲ ${delta.toFixed(1)}`, 'semantic.foreground.positive.primary'] as const)
      : delta < 0
        ? ([`▼ ${Math.abs(delta).toFixed(1)}`, 'semantic.foreground.negative.primary'] as const)
        : (['그대로', 'semantic.foreground.neutral.secondary'] as const);
  return (
    <Typography as="span" variant="caption1" weight="bold" color={color} sx={{ whiteSpace: 'nowrap' }}>
      {text}
    </Typography>
  );
}

/** PRD 재리뷰 결과 맨 위: 지난 리뷰와 기준별 비교 (spec tool-result-view §2) */
export default function PrdCompare({ rows }: { rows: CompareRow[] }) {
  return (
    <Box>
      <Typography as="h3" variant="body1" weight="bold" sx={{ display: 'block', marginBottom: '8px' }}>
        지난 리뷰와 비교
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Typography as="table" aria-label="지난 리뷰와 비교" variant="body2" sx={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <Box as="th" scope="col" sx={head}>기준</Box>
              <Box as="th" scope="col" sx={head}>이전 → 지금</Box>
              <Box as="th" scope="col" sx={(t: Theme) => ({ ...head(t), width: '40%' })}>점수 (5점)</Box>
              <Box as="th" scope="col" sx={head}>차이</Box>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <Box as="td" sx={(t: Theme) => ({ ...cell(t), fontWeight: r.label === '전체' ? 700 : 400, whiteSpace: 'nowrap' })}>
                  {r.label}
                </Box>
                <Box as="td" sx={(t: Theme) => ({ ...cell(t), whiteSpace: 'nowrap' })}>
                  {num(r.before)} → <Typography as="span" variant="body2" weight="bold">{num(r.now)}</Typography>
                </Box>
                <Box as="td" sx={cell}>
                  <Bar before={r.before} now={r.now} />
                </Box>
                <Box as="td" sx={cell}>
                  <Delta delta={r.delta} />
                </Box>
              </tr>
            ))}
          </tbody>
        </Typography>
      </Box>
    </Box>
  );
}
