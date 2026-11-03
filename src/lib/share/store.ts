import { sharePayloadSchema, type SharePayload } from './payload';

// hatch_shares 표 (supabase/shares.sql). 비밀 키는 Vercel 서버 env에만 있다. 설문 저장(survey/store.ts)과 같은 REST 방식
// fetch를 받을 수 있게 해 테스트는 실제 Supabase 없이 돈다

export class ShareStoreError extends Error {}

type Fetch = typeof fetch;
type Config = { url: string; key: string };

export const shareConfig = (): Config | null => {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && key ? { url, key } : null;
};

const headersOf = (key: string): Record<string, string> => ({
  apikey: key,
  'Content-Type': 'application/json',
  ...(key.startsWith('eyJ') && { Authorization: `Bearer ${key}` }),
});

async function call(c: Config, f: Fetch, path: string, init: RequestInit) {
  let res: Response;
  try {
    res = await f(`${c.url}/rest/v1/${path}`, { ...init, headers: headersOf(c.key), cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    console.error('[share] Supabase에 닿지 못함', e);
    throw new ShareStoreError('공유 저장소에 닿지 못했어요.');
  }
  if (!res.ok) {
    // 응답 본문에 공유 내용이 섞일 수 있어 상태 코드만 남긴다
    console.error('[share] Supabase 오류', res.status);
    throw new ShareStoreError('공유 저장소 오류예요.');
  }
  return res;
}

/** true = 저장됨, false = 묘비(끈 링크)거나 더 새 판이 있음 */
export async function putShare(c: Config, tokenHash: string, ideaId: string, payload: SharePayload, at: number, f: Fetch = fetch) {
  const res = await call(c, f, 'rpc/put_hatch_share', {
    method: 'POST',
    body: JSON.stringify({ p_token_hash: tokenHash, p_idea_id: ideaId, p_payload: payload, p_at: at }),
  });
  return (await res.json()) === true;
}

export async function deleteShare(c: Config, tokenHash: string, at: number, f: Fetch = fetch) {
  await call(c, f, 'rpc/delete_hatch_share', { method: 'POST', body: JSON.stringify({ p_token_hash: tokenHash, p_at: at }) });
}

/** 끈 링크 · 없는 링크 · 깨진 내용은 모두 null (화면은 같은 답) */
export async function getShare(c: Config, tokenHash: string, f: Fetch = fetch): Promise<SharePayload | null> {
  const q = `hatch_shares?select=payload&token_hash=eq.${tokenHash}&deleted_at=is.null&limit=1`;
  const rows = (await (await call(c, f, q, { method: 'GET' })).json()) as { payload: unknown }[];
  const parsed = sharePayloadSchema.safeParse(rows[0]?.payload);
  return parsed.success ? parsed.data : null;
}
