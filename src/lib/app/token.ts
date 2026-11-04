import 'server-only';

import { timingSafeEqual } from 'node:crypto';

import { isDemo } from '@/lib/demo';

// 맥 앱이 켤 때마다 만드는 비밀값 (spec 2026-11-04-macos-app §1-1). 같은 맥의 다른 프로그램이 앱 전용 주소를 못 쓰게
export const APP_TOKEN_HEADER = 'x-hatch-app-token';
export const APP_TOKEN_MIN = 32;
export const NO_STORE = { 'Cache-Control': 'no-store' };

export function appAuth(given: string | null): 'ok' | 'off' | 'denied' {
  const want = process.env.HATCH_APP_TOKEN?.trim() ?? '';
  if (isDemo() || want.length < APP_TOKEN_MIN) return 'off';
  const a = Buffer.from(given ?? '');
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'denied';
}

/** 꺼짐은 없는 주소처럼 404, 비밀값이 틀리면 401 */
export function deny(auth: 'off' | 'denied') {
  return Response.json({ ok: false }, { status: auth === 'off' ? 404 : 401, headers: NO_STORE });
}
