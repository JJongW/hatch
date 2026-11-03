import { createHmac, timingSafeEqual } from 'node:crypto';

// 맥 → Vercel 올리기 요청 서명 (spec §3-2). 서명 = hex HMAC-SHA256(발행 토큰, `${시각}.${본문 원문}`)
export const MAX_SKEW_MS = 5 * 60_000;

export const signPublish = (secret: string, time: number, body: string) =>
  createHmac('sha256', secret).update(`${time}.${body}`).digest('hex');

export type SignCheck = { ok: true; time: number } | { ok: false; reason: 'missing' | 'stale' | 'bad-signature' };

export function verifyPublish(secret: string, timeHeader: string | null, signature: string | null, body: string, now = Date.now()): SignCheck {
  if (!secret || !timeHeader || !signature || !/^\d{13}$/.test(timeHeader) || !/^[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: 'missing' };
  const time = Number(timeHeader);
  if (Math.abs(now - time) > MAX_SKEW_MS) return { ok: false, reason: 'stale' };
  const expected = Buffer.from(signPublish(secret, time, body), 'hex');
  const given = Buffer.from(signature, 'hex');
  if (!timingSafeEqual(expected, given)) return { ok: false, reason: 'bad-signature' };
  return { ok: true, time };
}
