'use client';

import { useEffect, useState } from 'react';
import { Box, FlexBox, Loading, Typography, type Theme } from '@montage-ui/core';

import { formatElapsed, visibleSteps } from './running-steps';

type Props = {
  label: string;
  /** 예상 순서. 비면 단계 줄을 그리지 않는다 */
  steps?: readonly string[];
};

// 글자 위로 밝은 띠가 지나간다. 줄인 모션 설정이면 반짝임 없이 보통 글자로
const shimmer = (t: Theme) => {
  const fg = t.semantic.foreground.neutral.primary;
  const light = t.semantic.foreground.neutral.quaternary;
  return {
    background: `linear-gradient(90deg, ${fg} 0%, ${fg} 35%, ${light} 50%, ${fg} 65%, ${fg} 100%)`,
    backgroundSize: '250% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    animation: 'hatch-shimmer 1.6s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', background: 'none', color: fg },
  };
};

/**
 * 1~2분 걸리는 생성 중 표시. 반짝이는 문구, 지난 시간(이 화면을 연 뒤부터 센다), 예상 순서를 한 줄씩 보여 준다.
 * 예상 순서는 진짜 진행이 아니다 (claude -p는 중간 진행을 주지 않는다). 그래서 화면에도 그렇게 적는다
 */
export default function RunningNote({ label, steps = [] }: Props) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const shown = visibleSteps(sec, steps.length);

  return (
    // 스크린리더에는 문구와 새 단계만 알린다 (지난 시간은 매초 바뀌어 aria-hidden)
    <FlexBox flexDirection="column" gap="10px" role="status">
      <FlexBox alignItems="center" gap="8px">
        {/* size는 단위까지 문자열로 (숫자면 CSS가 깨진다). Loading 기본 margin: 0 auto를 지워 왼쪽에 붙인다 */}
        <Loading variant="circular" size="20px" sx={{ margin: 0, flexShrink: 0 }} />
        <Typography variant="body2" weight="medium" sx={shimmer}>
          {label}
        </Typography>
        <Typography aria-hidden variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatElapsed(sec)} 지남
        </Typography>
      </FlexBox>
      {steps.length > 0 && (
        <Box>
          <Box
            as="ol"
            sx={(t: Theme) => ({
              listStyle: 'none',
              margin: 0,
              padding: '0 0 0 12px',
              borderLeft: `2px solid ${t.semantic.line.neutral.primary}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            })}
          >
            {steps.slice(0, shown).map((s, i) => (
              <Typography
                key={s}
                as="li"
                variant="body2"
                color={i === shown - 1 ? 'semantic.foreground.neutral.primary' : 'semantic.foreground.neutral.secondary'}
                weight={i === shown - 1 ? 'medium' : 'regular'}
                sx={{ '--hatch-rise': '4px', animation: 'hatch-rise 350ms ease-out both' }}
              >
                {s}
              </Typography>
            ))}
          </Box>
          <Typography variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block', marginTop: '6px' }}>
            예상 순서예요. 실제 진행과 다를 수 있어요.
          </Typography>
        </Box>
      )}
    </FlexBox>
  );
}
