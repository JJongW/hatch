'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Box, respondMore, SectionMessage, type Theme } from '@montage-ui/core';

import { DemoProvider } from './demo';
import SideNav, { SideNavView } from './side-nav';

import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ demo?: boolean }>;

// 네비바 폭 + 본문 좌우 여백. 틀 최대 폭 = NAV + 본문 최대 폭 + GUTTER * 2 + 양옆 선 2px (전역 border-box)
const NAV = 240;
const GUTTER = 48;
const frameWidth = (content: number) => `${NAV + content + GUTTER * 2 + 2}px`;
const line = (t: Theme) => ({ borderInline: `1px solid ${t.semantic.line.neutral.primary}` });

// 넓으면 좌측 네비바 + 본문, 좁으면 네비바가 위로.
// 넓은 화면에서는 네비바와 본문을 한 틀로 묶어 가운데에 두고, 바깥은 옅은 배경으로 채운다 (#76)
export default function AppShell({ children, demo }: Props) {
  return (
    <Box sx={(t: Theme) => ({ [respondMore('768px')]: { background: t.semantic.background.neutral.secondary } })}>
      {/* 설문 화면(FocusPage)에서는 네비바(첫 칸)를 숨긴다 (#71) */}
      <Box
        sx={(t: Theme) => ({
          display: 'flex',
          flexDirection: 'column',
          background: t.semantic.background.neutral.primary,
          '&:has([data-focus-page]) > :first-child': { display: 'none' },
          [respondMore('768px')]: {
            flexDirection: 'row',
            minHeight: '100vh',
            maxWidth: frameWidth(880),
            marginInline: 'auto',
            '&:has([data-wide-page])': { maxWidth: frameWidth(1120) },
            '&:has([data-focus-page])': { maxWidth: `${640 + GUTTER * 2 + 2}px` },
          },
          // 바깥 배경이 보일 만큼 넓을 때만 틀 양옆에 선을 긋는다. 틀 폭이 화면마다 달라 기준도 따로 둔다
          [respondMore(frameWidth(880))]: line(t),
          '&:has([data-wide-page])': { [respondMore(frameWidth(880))]: { borderInline: 'none' }, [respondMore(frameWidth(1120))]: line(t) },
          '&:has([data-focus-page])': { [respondMore('768px')]: line(t) },
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
    </Box>
  );
}
