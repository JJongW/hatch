'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Box, respondMore, SectionMessage } from '@montage-ui/core';

import { DemoProvider } from './demo';
import SideNav, { SideNavView } from './side-nav';

import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ demo?: boolean }>;

// 넓으면 좌측 네비바 + 본문, 좁으면 네비바가 위로. 본문은 남은 공간의 가운데 (#72)
export default function AppShell({ children, demo }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', [respondMore('768px')]: { flexDirection: 'row' } }}>
      <Suspense fallback={<SideNavView pathname={null} />}>
        <SideNav />
      </Suspense>
      <Box as="main" sx={{ flex: 1, minWidth: 0, padding: '32px 24px 64px' }}>
        <Box sx={{ maxWidth: '880px', marginInline: 'auto', '&:has([data-wide-page])': { maxWidth: '1120px' } }}>
          {demo && (
            <Box sx={{ marginBottom: '24px' }}>
              <SectionMessage variant="info">
                읽기 전용 데모예요. 샘플 아이디어, 문서, 도구 결과를 둘러볼 수 있어요. 직접 만들려면{' '}
                <Link href="/start" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                  내 환경에서 사용하기
                </Link>
                .
              </SectionMessage>
            </Box>
          )}
          <DemoProvider demo={!!demo}>{children}</DemoProvider>
        </Box>
      </Box>
    </Box>
  );
}
