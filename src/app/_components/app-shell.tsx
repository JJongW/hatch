'use client';

import { Suspense } from 'react';
import { Box, respondMore, SectionMessage } from '@montage-ui/core';

import SideNav, { SideNavView } from './side-nav';

import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ demo?: { repoUrl: string } }>;

// 넓으면 좌측 네비바 + 본문, 좁으면 네비바가 위로
export default function AppShell({ children, demo }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', [respondMore('768px')]: { flexDirection: 'row' } }}>
      <Suspense fallback={<SideNavView pathname={null} />}>
        <SideNav />
      </Suspense>
      <Box as="main" sx={{ flex: 1, minWidth: 0, maxWidth: '880px', padding: '32px 24px 64px' }}>
        {demo && (
          <Box sx={{ marginBottom: '24px' }}>
            <SectionMessage variant="info">
              읽기 전용 데모예요. 샘플 아이디어 · 문서 · 도구 결과를 둘러볼 수 있고, 저장 · 생성은 내 맥에서 실행할 때만
              돼요 (<a href={demo.repoUrl}>GitHub README</a>).
            </SectionMessage>
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
}
