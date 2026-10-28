import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { PropsWithChildren } from 'react';

import { isDemo, REPO_URL } from '@/lib/demo';

import AppShell from './_components/app-shell';
import Providers from './providers';

import '@montage-ui/core/global.css';
import './globals.css';

// 제목(페이지 제목 · 로고)은 HS산토끼체 2.0, 나머지는 머니그라피 Rounded (globals.css)
const titleFont = localFont({ src: './fonts/HSSanTokki2.ttf', variable: '--font-title', display: 'swap' });
const bodyFont = localFont({ src: './fonts/Moneygraphy-Rounded.woff2', variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'Hatch',
  description: '아이디어 한 줄을 기획안 · PRD · 기능명세 · 프롬프트로 부화시키는 PO용 아이디어 뱅크',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ko" className={`${titleFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Providers>
          <AppShell demo={isDemo() ? { repoUrl: REPO_URL } : undefined}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
