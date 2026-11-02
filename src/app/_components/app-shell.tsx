'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Box, respondMore, SectionMessage, type Theme } from '@montage-ui/core';

import { DemoProvider } from './demo';
import SideNav, { SideNavView } from './side-nav';

import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ demo?: boolean }>;

const GUTTER = 48;

// 넓으면 좌측 네비바 + 본문, 좁으면 네비바가 위로.
// 네비바는 늘 화면 왼쪽에 띄운 둥근 패널(side-nav.tsx)이고, 본문은 남은 폭 가운데 (#111).
// 예전엔 네비+본문을 화면마다 다른 폭의 틀로 묶어 가운데에 둬서, 이동할 때 네비 위치와 양옆 세로선이 바뀌었다
export default function AppShell({ children, demo }: Props) {
  return (
    <Box>
      {/* 설문 화면(FocusPage)에서는 네비바(첫 칸)를 숨긴다 (#71) */}
      <Box
        sx={(t: Theme) => ({
          display: 'flex',
          flexDirection: 'column',
          background: t.semantic.background.neutral.primary,
          '&:has([data-focus-page]) > :first-child': { display: 'none' },
          [respondMore('768px')]: { flexDirection: 'row', minHeight: '100vh' },
        })}
      >
        <Suspense fallback={<SideNavView pathname={null} />}>
          <SideNav />
        </Suspense>
        <Box as="main" sx={{ flex: 1, minWidth: 0, padding: '32px 24px 64px', [respondMore('768px')]: { padding: `40px ${GUTTER}px 72px` } }}>
          <Box
            sx={{
              maxWidth: '880px',
              marginInline: 'auto',
              '&:has([data-wide-page])': { maxWidth: '1120px' },
              '&:has([data-focus-page])': { maxWidth: '640px' },
              '&:has([data-focus-page]) > [data-demo-banner]': { display: 'none' },
            }}
          >
            {demo && (
              <Box data-demo-banner sx={{ marginBottom: '24px' }}>
                <SectionMessage variant="info">
                  읽기 전용 데모예요. 샘플 아이디어, 문서, 도구 결과를 둘러볼 수 있어요. 만드는 과정은{' '}
                  <Link href="/try" style={{ textDecoration: 'underline', fontWeight: 600 }}>
                    흐름 체험하기
                  </Link>
                  에서 예시로 해 볼 수 있고, 직접 만들려면{' '}
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
    </Box>
  );
}
