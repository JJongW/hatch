import { afterEach, describe, expect, it, vi } from 'vitest';

import { appAuth, deny } from './token';

const TOKEN = 'a'.repeat(64);
afterEach(() => vi.unstubAllEnvs());

describe('appAuth', () => {
  it('비밀값이 없거나 32자보다 짧으면 꺼짐 (웹 버전과 데모)', () => {
    vi.stubEnv('HATCH_APP_TOKEN', '');
    expect(appAuth(TOKEN)).toBe('off');
    vi.stubEnv('HATCH_APP_TOKEN', 'short');
    expect(appAuth('short')).toBe('off');
  });
  it('데모에서는 비밀값이 있어도 꺼짐', () => {
    vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
    vi.stubEnv('HATCH_DEMO', '1');
    expect(appAuth(TOKEN)).toBe('off');
  });
  it('같으면 ok, 다르거나 없으면 denied', () => {
    vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
    expect(appAuth(TOKEN)).toBe('ok');
    expect(appAuth('b'.repeat(64))).toBe('denied');
    expect(appAuth(TOKEN.slice(1))).toBe('denied');
    expect(appAuth(null)).toBe('denied');
  });
  it('꺼짐은 404, 거절은 401, 둘 다 캐시하지 않는다', () => {
    expect(deny('off').status).toBe(404);
    expect(deny('denied').status).toBe(401);
    expect(deny('denied').headers.get('cache-control')).toBe('no-store');
  });
});
