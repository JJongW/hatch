'use client';

import { ThemeProvider } from '@montage-ui/core';
import { AppRouterCacheProvider } from '@montage-ui/nextjs';

import type { PropsWithChildren } from 'react';

// Montage는 Emotion 기반이라 클라이언트 경계가 필요하다. 순서는 Montage 문서대로 Theme → Cache.
export default function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
    </ThemeProvider>
  );
}
