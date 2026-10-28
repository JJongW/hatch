'use client';

import { Suspense } from 'react';
import { Box, respondMore } from '@montage-ui/core';

import SideNav, { SideNavView } from './side-nav';

import type { PropsWithChildren } from 'react';

// 넓으면 좌측 네비바 + 본문, 좁으면 네비바가 위로
export default function AppShell({ children }: PropsWithChildren) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', [respondMore('768px')]: { flexDirection: 'row' } }}>
      <Suspense fallback={<SideNavView pathname={null} />}>
        <SideNav />
      </Suspense>
      <Box as="main" sx={{ flex: 1, minWidth: 0, maxWidth: '880px', padding: '32px 24px 64px' }}>
        {children}
      </Box>
    </Box>
  );
}
