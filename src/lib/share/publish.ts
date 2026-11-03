import { z } from 'zod';

import { isValidId } from '@/lib/storage';

import { PAYLOAD_MAX_BYTES, sharePayloadSchema } from './payload';
import { verifyPublish } from './sign';
import { deleteShare, putShare, shareConfig, ShareStoreError } from './store';
import { hashShareToken, isShareToken } from './token';

// POST /api/publish 의 판단 전부 (route.ts는 이걸 부르기만). 응답 본문에는 이유를 짧게만 (공격자에게 힌트 최소)
const requestSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('put'), token: z.string(), ideaId: z.string(), payload: sharePayloadSchema }).strict(),
  z.object({ op: z.literal('delete'), token: z.string() }).strict(),
]);

export type PublishResult = { status: number; body: { ok: boolean; error?: string } };
/** 발행 토큰이 이보다 짧으면 쓰지 않는다 (짧은 비밀은 HMAC을 추측할 수 있다). `openssl rand -base64 32`로 만든다 */
export const PUBLISH_SECRET_MIN = 32;
type Deps = { secret: string | undefined; now?: number; fetch?: typeof fetch };

export async function handlePublish(raw: string, timeHeader: string | null, signature: string | null, deps: Deps): Promise<PublishResult> {
  const fail = (status: number, error: string): PublishResult => ({ status, body: { ok: false, error } });
  const secret = deps.secret?.trim() ?? '';
  const config = shareConfig();
  // 설정이 빠졌어도 밖에는 서명 실패와 같은 답 (배포 상태를 알리지 않는다). 이유는 서버 로그에만
  if (secret.length < PUBLISH_SECRET_MIN || !config) {
    console.error('[share] 발행 토큰(32자 이상) 또는 Supabase 설정이 없음');
    return fail(401, 'unauthorized');
  }
  if (Buffer.byteLength(raw) > PAYLOAD_MAX_BYTES) return fail(413, 'too-large');

  const signed = verifyPublish(secret, timeHeader, signature, raw, deps.now);
  if (!signed.ok) return fail(401, 'unauthorized');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, 'bad-request');
  }
  const req = requestSchema.safeParse(json);
  if (!req.success || !isShareToken(req.data.token)) return fail(400, 'bad-request');
  if (req.data.op === 'put' && !isValidId(req.data.ideaId)) return fail(400, 'bad-request');

  const hash = hashShareToken(req.data.token);
  try {
    if (req.data.op === 'delete') {
      await deleteShare(config, hash, signed.time, deps.fetch);
      return { status: 200, body: { ok: true } };
    }
    const saved = await putShare(config, hash, req.data.ideaId, req.data.payload, signed.time, deps.fetch);
    return saved ? { status: 200, body: { ok: true } } : fail(409, 'closed-or-stale');
  } catch (e) {
    if (e instanceof ShareStoreError) return fail(502, 'store');
    throw e;
  }
}
