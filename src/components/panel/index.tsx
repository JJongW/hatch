'use client';

import { Box } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof Box> & {
  /** 머리줄과 본문이 따로 있는 상자(코드, 구성도)는 안쪽 여백 없이 가장자리까지 */
  flush?: boolean;
};

const panelStyle = (flush: boolean) => (t: Theme) => ({
  border: `1px solid ${t.semantic.line.neutral.primary}`,
  borderRadius: '12px',
  ...(flush ? { overflow: 'hidden' } : { padding: '16px' }),
});

/**
 * 테두리로 묶는 상자. Montage `Card`는 썸네일, 제목, 캡션을 가진 콘텐츠 카드라 이 용도가 아니고,
 * 테두리 패널 컴포넌트는 없어서 토큰으로 여기 한 곳에서만 만든다 (spec montage-audit §3)
 */
export default function Panel({ flush = false, sx, ...props }: Props) {
  return <Box {...props} sx={[panelStyle(flush), sx]} />;
}
