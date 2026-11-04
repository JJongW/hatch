import { revalidatePath } from 'next/cache';

import { splitQuick } from '@/lib/app/quick-idea';
import { APP_TOKEN_HEADER, appAuth, deny, NO_STORE } from '@/lib/app/token';
import { createIdea, StorageError } from '@/lib/storage';

const BODY_MAX = 16_000; // 2,000자 한글은 UTF-8로 6KB쯤. 넉넉히 두고, 본문을 다 읽은 뒤 실제 바이트 수로 센다 (내 컴퓨터에서만 도는 서버라 스트리밍으로 끊지 않는다)

// 메뉴 막대 빠른 아이디어 저장 (spec 2026-11-04-macos-app §3-4)
export async function POST(request: Request) {
  const auth = appAuth(request.headers.get(APP_TOKEN_HEADER));
  if (auth !== 'ok') return deny(auth);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > BODY_MAX) return Response.json({ ok: false, error: '너무 길어요.' }, { status: 413, headers: NO_STORE });
  let text: unknown;
  try {
    text = (JSON.parse(raw) as { text?: unknown })?.text;
  } catch {
    return Response.json({ ok: false, error: '형식이 맞지 않아요.' }, { status: 400, headers: NO_STORE });
  }
  const parsed = splitQuick(text);
  if ('error' in parsed) return Response.json({ ok: false, error: parsed.error }, { status: 400, headers: NO_STORE });
  try {
    const idea = await createIdea(parsed);
    revalidatePath('/');
    revalidatePath('/ideas', 'layout');
    return Response.json({ ok: true, id: idea.id, path: `/ideas/${idea.id}` }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof StorageError) return Response.json({ ok: false, error: e.message }, { status: 400, headers: NO_STORE });
    console.error('[hatch] app ideas', e);
    return Response.json({ ok: false, error: '저장하지 못했어요. 데이터 폴더를 확인해 주세요.' }, { status: 500, headers: NO_STORE });
  }
}
