import type { NextConfig } from "next";

// 다른 기기에서 Tailscale Serve로 열 때 주소창 호스트 (예: my-mac.tail1234.ts.net). dev 서버용.
// npm start는 Serve가 x-forwarded-host로 넘겨줘서 비워 둬도 된다 (2026-10-28 확인).
// 와일드카드(*.ts.net)는 쓰지 않는다 — 다른 tailnet 사이트도 허용된다.
// 주소창 값을 그대로 붙여도 되게 스킴 · 포트 · 경로는 떼어 낸다.
const serveHost = process.env.HATCH_SERVE_HOST?.trim()
  .replace(/^https?:\/\//, '')
  .replace(/[:/].*$/, '');

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 읽기 전용 데모(HATCH_DEMO=1, HATCH_DATA_DIR=demo-data)가 샘플 md를 읽도록 서버 번들에 넣는다
  outputFileTracingIncludes: { '/**': ['./demo-data/**/*'] },
  ...(serveHost && {
    allowedDevOrigins: [serveHost],
    experimental: { serverActions: { allowedOrigins: [serveHost] } },
  }),
};

export default nextConfig;
