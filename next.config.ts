import type { NextConfig } from "next";

// 다른 기기에서 Tailscale Serve로 열 때 주소창 호스트 (예: my-mac.tail1234.ts.net). dev 서버용.
// npm start는 Serve가 x-forwarded-host로 넘겨줘서 비워 둬도 된다 (2026-10-28 확인).
// 와일드카드(*.ts.net)는 쓰지 않는다 — 다른 tailnet 사이트도 허용된다.
// 주소창 값을 그대로 붙여도 되게 스킴 · 포트 · 경로는 떼어 낸다.
const serveHost = process.env.HATCH_SERVE_HOST?.trim()
  .replace(/^https?:\/\//, '')
  .replace(/[:/].*$/, '');

// 공유 링크 화면 보안 헤더 (spec 2026-11-03-hosted-po §3-4). nonce는 Cache Components 정적 셸에 못 넣어 쓰지 않는다 ('unsafe-inline').
// 대신 connect-src · img-src · form-action을 막아 스크립트가 들어와도 fetch · 이미지 · 폼으로는 못 보낸다.
// 페이지 이동(location=)으로 내보내는 건 CSP로 못 막는다 — 공유 내용은 원래 링크를 아는 사람에게 공개라 받아들인다. 글꼴 CSS만 jsdelivr
const SHARE_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/s/:token*',
        headers: [
          { key: 'Content-Security-Policy', value: SHARE_CSP },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  // 읽기 전용 데모(HATCH_DEMO=1, HATCH_DATA_DIR=demo-data)가 샘플 md를 읽도록 서버 번들에 넣는다
  outputFileTracingIncludes: { '/**': ['./demo-data/**/*'] },
  // 맥 앱 번들용 (spec 2026-11-04-macos-app §1). macos/scripts/build.sh만 켠다. 웹, Vercel 빌드는 그대로
  ...(process.env.HATCH_STANDALONE === '1' && {
    output: 'standalone' as const,
    outputFileTracingRoot: process.cwd(), // 상위 폴더 lockfile을 뿌리로 잡아 server.js가 깊이 숨지 않게
    // 소스, 문서, 테스트 설정은 번들에 넣지 않는다. docs.ts의 동적 fs 읽기 때문에 추적이 프로젝트 전체로 번지는데, 여기서 뺀다
    outputFileTracingExcludes: {
      '/**': [
        './src/**', './docs/**', './bridge/**', './supabase/**', './.anatomy/**', './.superpowers/**', './macos/**',
        './*.md', './tsconfig*', './eslint.config.mjs', './vitest.config.ts',
      ],
    },
  }),
  ...(serveHost && {
    allowedDevOrigins: [serveHost],
    experimental: { serverActions: { allowedOrigins: [serveHost] } },
  }),
};

export default nextConfig;
