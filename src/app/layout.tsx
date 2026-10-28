import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import Providers from './providers';

import '@montage-ui/core/global.css';

export const metadata: Metadata = {
  title: 'Hatch',
  description: '아이디어 한 줄을 기획안 · PRD · 기능명세 · 프롬프트로 부화시키는 PO용 아이디어 뱅크',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
