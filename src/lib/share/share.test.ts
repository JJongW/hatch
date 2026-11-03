import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SharePayload } from './payload';
import { handlePublish } from './publish';
import { MAX_SKEW_MS, signPublish, verifyPublish } from './sign';
import { getShare } from './store';
import { hashShareToken, isShareToken, newShareToken } from './token';

const SECRET = 'test-secret-that-is-at-least-32-chars';
const NOW = 1_762_000_000_000;
const TOKEN = 'A'.repeat(32);
const ID = '20261103-1100-abcd';
const payload: SharePayload = {
  v: 1,
  title: '사내 회의실 빈자리 알림',
  memo: '노쇼가 나면 근처 사람에게',
  context: [{ label: '목표 고객', value: '팀원' }],
  docs: [{ label: '기획안', content: '## 문제\n노쇼' }],
  questions: [{ group: '고객에게 물을 것', question: '얼마나 자주?' }],
  decisions: [{ question: '알림 채널', status: 'decided', answer: '슬랙', reason: '이미 씀' }],
};

// 가짜 Supabase: 표 한 개를 메모리에 두고 SQL 함수와 같은 규칙으로 답한다
type Row = { idea_id: string; payload: unknown; published_at: number; deleted: boolean };
function fakeSupabase() {
  const rows = new Map<string, Row>();
  const calls: { url: string; body: string }[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = String(init?.body ?? '');
    calls.push({ url, body });
    const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
    if (url.endsWith('rpc/put_hatch_share')) {
      const a = JSON.parse(body);
      const r = rows.get(a.p_token_hash);
      if (r && (r.deleted || r.published_at >= a.p_at)) return ok(false);
      rows.set(a.p_token_hash, { idea_id: a.p_idea_id, payload: a.p_payload, published_at: a.p_at, deleted: false });
      return ok(true);
    }
    if (url.endsWith('rpc/delete_hatch_share')) {
      const a = JSON.parse(body);
      rows.set(a.p_token_hash, { idea_id: '', payload: null, published_at: a.p_at, deleted: true });
      return ok(null);
    }
    const hash = /token_hash=eq\.([0-9a-f]+)/.exec(url)?.[1] ?? '';
    const r = rows.get(hash);
    return ok(r && !r.deleted ? [{ payload: r.payload }] : []);
  }) as typeof fetch;
  return { f, rows, calls };
}

const send = (db: ReturnType<typeof fakeSupabase>, body: object, opts: { at?: number; now?: number; secret?: string; sig?: string } = {}) => {
  const raw = JSON.stringify(body);
  const at = opts.at ?? NOW;
  return handlePublish(raw, String(at), opts.sig ?? signPublish(opts.secret ?? SECRET, at, raw), { secret: SECRET, now: opts.now ?? NOW, fetch: db.f });
};
const config = { url: 'https://x.supabase.co', key: 'sb_secret_x' };

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', config.url);
  vi.stubEnv('SUPABASE_SECRET_KEY', config.key);
});
afterEach(() => vi.unstubAllEnvs());

describe('토큰', () => {
  it('24바이트 난수 → 32자, 매번 다르다', () => {
    const a = newShareToken();
    expect(isShareToken(a)).toBe(true);
    expect(a).not.toBe(newShareToken());
  });
  it('형식이 틀리면 거절, 해시는 64자 hex', () => {
    for (const t of ['', 'short', 'A'.repeat(33), `${'A'.repeat(31)}/`, '../../etc/passwd']) expect(isShareToken(t)).toBe(false);
    expect(hashShareToken(TOKEN)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('서명', () => {
  it('맞는 서명, 5분 안 → 통과', () => {
    expect(verifyPublish(SECRET, String(NOW), signPublish(SECRET, NOW, 'b'), 'b', NOW + MAX_SKEW_MS).ok).toBe(true);
  });
  it('5분 지남, 본문 바뀜, 다른 비밀, 헤더 없음 → 거절', () => {
    const sig = signPublish(SECRET, NOW, 'b');
    expect(verifyPublish(SECRET, String(NOW), sig, 'b', NOW + MAX_SKEW_MS + 1)).toEqual({ ok: false, reason: 'stale' });
    expect(verifyPublish(SECRET, String(NOW), sig, 'c', NOW)).toEqual({ ok: false, reason: 'bad-signature' });
    expect(verifyPublish(SECRET, String(NOW), signPublish('other', NOW, 'b'), 'b', NOW).ok).toBe(false);
    expect(verifyPublish(SECRET, null, sig, 'b', NOW)).toEqual({ ok: false, reason: 'missing' });
    expect(verifyPublish('', String(NOW), sig, 'b', NOW)).toEqual({ ok: false, reason: 'missing' });
  });
});

describe('올리기 (POST /api/publish)', () => {
  it('올리면 해시로만 저장되고 읽힌다', async () => {
    const db = fakeSupabase();
    expect((await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload })).status).toBe(200);
    expect(db.calls.some((c) => c.body.includes(TOKEN))).toBe(false); // 토큰 원문은 Supabase로 안 감
    expect(await getShare(config, hashShareToken(TOKEN), db.f)).toEqual(payload);
  });

  it('끄면 안 읽히고, 같은 토큰으로 다시 못 올린다 (재전송 막기)', async () => {
    const db = fakeSupabase();
    await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload });
    expect((await send(db, { op: 'delete', token: TOKEN }, { at: NOW + 1 })).status).toBe(200);
    expect(await getShare(config, hashShareToken(TOKEN), db.f)).toBeNull();
    expect((await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload }, { at: NOW + 2 })).status).toBe(409);
  });

  it('같은 요청을 다시 보내거나 옛 판을 보내면 거절', async () => {
    const db = fakeSupabase();
    await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload }, { at: NOW + 10 });
    expect((await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload }, { at: NOW + 10 })).status).toBe(409);
    expect((await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload }, { at: NOW + 5 })).status).toBe(409);
  });

  it('서명이 틀리거나 오래되면 401, 저장소는 부르지 않는다', async () => {
    const db = fakeSupabase();
    expect((await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload }, { secret: 'wrong' })).status).toBe(401);
    expect((await send(db, { op: 'put', token: TOKEN, ideaId: ID, payload }, { now: NOW + MAX_SKEW_MS + 1 })).status).toBe(401);
    expect(db.calls).toHaveLength(0);
  });

  it('허용 밖 칸, 잘못된 토큰 · id, 1MB 넘는 본문 → 거절', async () => {
    const db = fakeSupabase();
    const bad = [
      { op: 'put', token: TOKEN, ideaId: ID, payload: { ...payload, history: ['이전 판'] } },
      { op: 'put', token: TOKEN, ideaId: ID, payload: { ...payload, usage: { cost: 1 } } },
      { op: 'put', token: 'short', ideaId: ID, payload },
      { op: 'put', token: TOKEN, ideaId: '../x', payload },
      { op: 'put', token: TOKEN, ideaId: ID, payload, extra: 1 },
    ];
    for (const b of bad) expect((await send(db, b)).status).toBe(400);
    const huge = { op: 'put', token: TOKEN, ideaId: ID, payload: { ...payload, docs: Array(6).fill({ label: 'x', content: 'a'.repeat(190_000) }) } };
    expect((await send(db, huge)).status).toBe(413);
    expect(db.calls).toHaveLength(0);
  });

  it('Supabase나 발행 토큰이 없거나 32자보다 짧으면 서명 실패와 같은 401 (배포 상태를 알리지 않음)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = fakeSupabase();
    const raw = JSON.stringify({ op: 'delete', token: TOKEN });
    for (const secret of [undefined, '', 'short-secret']) {
      const r = await handlePublish(raw, String(NOW), signPublish(secret ?? '', NOW, raw), { secret, now: NOW, fetch: db.f });
      expect(r).toEqual({ status: 401, body: { ok: false, error: 'unauthorized' } });
    }
    vi.stubEnv('SUPABASE_URL', '');
    expect((await send(db, { op: 'delete', token: TOKEN })).status).toBe(401);
    expect(db.calls).toHaveLength(0);
  });
});

describe('읽기', () => {
  it('깨진 내용은 없는 링크와 같다', async () => {
    const f = (async () => new Response(JSON.stringify([{ payload: { v: 1, title: 'x' } }]))) as unknown as typeof fetch;
    expect(await getShare(config, hashShareToken(TOKEN), f)).toBeNull();
  });
});
