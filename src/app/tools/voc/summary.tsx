'use client';

import { useState } from 'react';
import { Box, Chip, FlexBox, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import type { VocFilterKey, VocSummary as Summary } from '@/lib/tools/voc/compute';

const cell = (t: Theme) => ({ padding: '8px 6px', borderTop: `1px solid ${t.semantic.line.neutral.primary}`, whiteSpace: 'nowrap' as const });
const head = (t: Theme) => ({ padding: '0 6px 8px', textAlign: 'left' as const, fontWeight: 600, whiteSpace: 'nowrap' as const, color: t.semantic.foreground.neutral.secondary });
const numCell = (t: Theme) => ({ ...cell(t), textAlign: 'right' as const });

/** VOC 결과 맨 위: 칩으로 주제를 걸러 보는 표 (spec tool-result-view §3). 순위는 걸러도 원래 순위 그대로 */
export default function VocSummary({ rows, filters }: Summary) {
  const [selected, setSelected] = useState<VocFilterKey>('all');
  const shown = rows.filter((r) => r.filters.includes(selected));
  return (
    <Box>
      <Typography as="h3" variant="body1" weight="bold" sx={{ display: 'block', marginBottom: '8px' }}>
        주제 걸러 보기
      </Typography>
      <FlexBox role="group" aria-label="주제 거르기" gap="6px" sx={{ flexWrap: 'wrap', marginBottom: '12px' }}>
        {filters.map((f) => (
          <Chip key={f.key} size="small" variant="outlined" active={selected === f.key} aria-pressed={selected === f.key} onClick={() => setSelected(f.key)}>
            {f.label} {f.count}
          </Chip>
        ))}
      </FlexBox>
      {/* 칩을 바꾸면 화면 읽기 프로그램에 남은 수만 알린다 */}
      <Box as="span" aria-live="polite" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>
        주제 {shown.length}개
      </Box>
      {shown.length === 0 ? (
        <Typography as="p" variant="body2" color="semantic.foreground.neutral.secondary">
          이 조건에 맞는 주제가 없어요
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Typography as="table" aria-label="걸러 본 주제" variant="body2" sx={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr>
                <Box as="th" scope="col" sx={head}>순위</Box>
                <Box as="th" scope="col" sx={(t: Theme) => ({ ...head(t), width: '100%' })}>주제</Box>
                <Box as="th" scope="col" sx={(t: Theme) => ({ ...head(t), textAlign: 'right' })}>건수</Box>
                <Box as="th" scope="col" sx={(t: Theme) => ({ ...head(t), textAlign: 'right' })}>평균 심각도</Box>
                <Box as="th" scope="col" sx={(t: Theme) => ({ ...head(t), textAlign: 'right' })}>점수</Box>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.name}>
                  <Box as="td" sx={cell}>{r.rank}</Box>
                  <Box as="td" sx={(t: Theme) => ({ ...cell(t), whiteSpace: 'normal', minWidth: '96px' })}>{r.name}</Box>
                  <Box as="td" sx={numCell}>{r.count}</Box>
                  <Box as="td" sx={numCell}>{r.average ?? '없음'}</Box>
                  <Box as="td" sx={numCell}>{r.score}</Box>
                </tr>
              ))}
            </tbody>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
