import { APP_TOKEN_HEADER, appAuth, deny, NO_STORE } from '@/lib/app/token';
import { jobsSnapshot } from '@/lib/app/jobs';
import { isClaudeBusy } from '@/lib/claude/run';

// 맥 앱이 알림, 메뉴 막대 상태를 위해 묻는 주소 (spec 2026-11-04-macos-app §3-2). request.headers를 읽어 늘 동적
export async function GET(request: Request) {
  const auth = appAuth(request.headers.get(APP_TOKEN_HEADER));
  if (auth !== 'ok') return deny(auth);
  return Response.json({ ok: true, claudeBusy: isClaudeBusy(), ...jobsSnapshot() }, { headers: NO_STORE });
}
