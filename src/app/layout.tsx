import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { PropsWithChildren } from 'react';

import { isDemo, REPO_URL } from '@/lib/demo';

import AppShell from './_components/app-shell';
import Providers from './providers';

import '@montage-ui/core/global.css';
import './globals.css';

// 로고만 따로: "Hatch"는 Avigea, "해치"는 HS산토끼체 2.0. 나머지는 Pretendard (globals.css)
const logoEnFont = localFont({ src: './fonts/Avigea.woff2', variable: '--font-logo-en', display: 'swap' });
const logoKoFont = localFont({ src: './fonts/HSSanTokki2.ttf', variable: '--font-logo-ko', display: 'swap' });
// Montage는 Pretendard를 이름으로만 부르고 파일은 안 준다 → 설치 안 된 기기는 시스템 글꼴이 된다. 그래서 직접 싣는다 (OFL)
const bodyFont = localFont({ src: './fonts/PretendardVariable.woff2', variable: '--font-body', weight: '45 920', display: 'swap' });

export const metadata: Metadata = {
  title: 'Hatch',
  description: '아이디어 한 줄을 기획안 · PRD · 기능명세 · 프롬프트로 부화시키는 PO용 아이디어 뱅크',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ko" className={`${logoEnFont.variable} ${logoKoFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
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
