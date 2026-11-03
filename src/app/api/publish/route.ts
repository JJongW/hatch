import { handlePublish } from '@/lib/share/publish';

// 맥 → Vercel 공유 사본 올리기 · 지우기 (spec 2026-11-03-hosted-po §3-2). 판단은 모두 handlePublish에
export async function POST(request: Request) {
  const raw = await request.text();
  const { status, body } = await handlePublish(raw, request.headers.get('x-hatch-time'), request.headers.get('x-hatch-signature'), {
    secret: process.env.HATCH_PUBLISH_TOKEN,
  });
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
