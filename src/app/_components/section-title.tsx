'use client';

import { Typography } from '@montage-ui/core';

import type { PropsWithChildren } from 'react';

export default function SectionTitle({ children }: PropsWithChildren) {
  return (
    <Typography as="h2" variant="headline2" weight="bold" sx={{ display: 'block', margin: '40px 0 12px' }}>
      {children}
    </Typography>
  );
}
