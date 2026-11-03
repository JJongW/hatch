import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isShareReady, sendPublish, shareLink, ShareError } from './client';
import { verifyPublish } from './sign';

const SECRET = 'x'.repeat(32);
const TOKEN = 'A'.repeat(32);

beforeEach(() => {
  vi.stubEnv('HATCH_PUBLISH_URL', 'https://hatch.example.com/api/publish');
  vi.stubEnv('HATCH_PUBLISH_TOKEN', SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('맥 → 올리기', () => {
  it('설정이 없거나 토큰이 짧거나 주소가 https가 아니면 공유 버튼을 안 보인다', () => {
    expect(isShareReady()).toBe(true);
    vi.stubEnv('HATCH_PUBLISH_TOKEN', 'short');
    expect(isShareReady()).toBe(false);
    vi.stubEnv('HATCH_PUBLISH_TOKEN', SECRET);
    vi.stubEnv('HATCH_PUBLISH_URL', 'http://evil.example.com/api/publish');
    expect(isShareReady()).toBe(false);
  });

  it('링크는 같은 사이트의 /s/<토큰>', () => {
    expect(shareLink(TOKEN)).toBe(`https://hatch.example.com/s/${TOKEN}`);
  });

  it('Vercel이 검증할 수 있는 서명을 붙인다', async () => {
    let seen: { body: string; headers: Record<string, string> } | null = null;
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      seen = { body: String(init.body), headers: init.headers as Record<string, string> };
      return new Response('{"ok":true}');
    });
    await sendPublish({ op: 'delete', token: TOKEN }, 1_762_000_000_000);
    const s = seen!;
    expect(verifyPublish(SECRET, s.headers['x-hatch-time'], s.headers['x-hatch-signature'], s.body, 1_762_000_000_000).ok).toBe(true);
  });

  it('409 · 401 · 연결 실패는 PO가 할 일을 알려 주는 한 줄', async () => {
    for (const [status, text] of [[409, '새 링크'], [401, '시계'], [413, '1MB']] as const) {
      vi.stubGlobal('fetch', async () => new Response('{}', { status }));
      await expect(sendPublish({ op: 'delete', token: TOKEN })).rejects.toThrow(text);
    }
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    await expect(sendPublish({ op: 'delete', token: TOKEN })).rejects.toBeInstanceOf(ShareError);
  });
});
