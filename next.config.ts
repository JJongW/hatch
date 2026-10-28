import type { NextConfig } from "next";

// 다른 기기에서 Tailscale Serve로 열 때 주소창 호스트 (예: my-mac.tail1234.ts.net).
// Serve는 x-forwarded-host로 넘겨줘서 npm start는 비워 둬도 된다 (2026-10-28 확인). dev 서버용. 와일드카드(*.ts.net)는 쓰지 않는다 — 다른 tailnet 사이트도 허용된다.
const serveHost = process.env.HATCH_SERVE_HOST?.trim();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  ...(serveHost && {
    allowedDevOrigins: [serveHost],
    experimental: { serverActions: { allowedOrigins: [serveHost] } },
  }),
};

export default nextConfig;
