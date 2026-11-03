import 'server-only';

import { PUBLISH_SECRET_MIN } from './publish';
import type { SharePayload } from './payload';
import { signPublish } from './sign';

// 맥 → Vercel /api/publish (spec §3-2). 맥은 Supabase 키가 아니라 발행 토큰 하나만 갖는다
export class ShareError extends Error {}

// https만, 또는 로컬 확인용 http://localhost. 정규식 대신 URL로 읽어 userinfo(`http://localhost:@evil.com`) 같은 꼼수를 막는다
const safeUrl = (raw: string | undefined) => {
  try {
    const u = new URL(raw?.trim() ?? '');
    if (u.username || u.password) return null;
    return u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost') ? u.toString() : null;
  } catch {
    return null;
  }
};

const config = () => {
  const url = safeUrl(process.env.HATCH_PUBLISH_URL);
  const secret = process.env.HATCH_PUBLISH_TOKEN?.trim() ?? '';
  return url && secret.length >= PUBLISH_SECRET_MIN ? { url, secret } : null;
};

/** 공유 버튼을 보일지. 설정이 없으면 상세 화면에 버튼이 없다 */
export const isShareReady = () => config() !== null;

/** 보는 사람에게 보낼 주소. 올리기 주소(…/api/publish)와 같은 사이트의 /s/<토큰> */
export const shareLink = (token: string) => new URL(`/s/${token}`, config()?.url ?? 'http://localhost').toString();

type Body = { op: 'put'; token: string; ideaId: string; payload: SharePayload } | { op: 'delete'; token: string };

export async function sendPublish(body: Body, now = Date.now()): Promise<void> {
  const c = config();
  if (!c) throw new ShareError('공유 설정이 없어요. .env.local에 HATCH_PUBLISH_URL과 HATCH_PUBLISH_TOKEN을 넣어 주세요.');
  const raw = JSON.stringify(body);
  let res: Response;
  try {
    res = await fetch(c.url, {
      method: 'POST',
      body: raw,
      headers: { 'Content-Type': 'application/json', 'x-hatch-time': String(now), 'x-hatch-signature': signPublish(c.secret, now, raw) },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ShareError('공유 서버에 닿지 못했어요. 인터넷 연결을 확인해 주세요.');
  }
  if (res.ok) return;
  if (res.status === 409) throw new ShareError('이 링크에는 다시 올릴 수 없어요. 새 링크를 만들어 주세요.');
  if (res.status === 413) throw new ShareError('공유하기에 문서가 너무 커요 (1MB 넘음).');
  if (res.status === 401) throw new ShareError('공유 서버가 요청을 거절했어요. 맥과 Vercel의 HATCH_PUBLISH_TOKEN이 같은지, 맥 시계가 맞는지 확인해 주세요.');
  throw new ShareError(`공유하지 못했어요 (${res.status}).`);
}
