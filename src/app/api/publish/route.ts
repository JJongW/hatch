import { PAYLOAD_MAX_BYTES } from '@/lib/share/payload';
import { handlePublish } from '@/lib/share/publish';

// 맥 → Vercel 공유 사본 올리기 · 지우기 (spec 2026-11-03-hosted-po §3-2). 판단은 모두 handlePublish에
export async function POST(request: Request) {
  // 본문을 읽기 전에 크기부터 (Vercel 한도 4.5MB보다 먼저 거절)
  if (Number(request.headers.get('content-length') ?? 0) > PAYLOAD_MAX_BYTES) {
    return Response.json({ ok: false, error: 'too-large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
  }
  const raw = await request.text();
  const { status, body } = await handlePublish(raw, request.headers.get('x-hatch-time'), request.headers.get('x-hatch-signature'), {
    secret: process.env.HATCH_PUBLISH_TOKEN,
  });
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
