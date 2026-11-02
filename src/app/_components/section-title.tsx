'use client';

import { SectionHeader } from '@montage-ui/core';

import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<{
  /** 제목 오른쪽 (수정 같은 TextButton). Montage가 높이를 맞춰 준다 */
  trailing?: ReactNode;
  /** 페이지 첫 섹션처럼 위 여백이 필요 없을 때 */
  flush?: boolean;
  id?: string;
}>;

/** 페이지 안 섹션 제목. Montage SectionHeader(small = headline1)로 모든 화면이 같은 크기, 같은 간격 */
export default function SectionTitle({ children, trailing, flush = false, id }: Props) {
  return (
    <SectionHeader id={id} size="small" trailingContent={trailing} sx={{ margin: flush ? '0 0 12px' : '40px 0 12px' }}>
      {children}
    </SectionHeader>
  );
}
