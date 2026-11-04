import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { docJob, resetJobsForTest, startJob } from '@/lib/app/jobs';
import { listIdeas } from '@/lib/storage';

import { POST } from './ideas/route';
import { GET } from './status/route';

const TOKEN = 'k'.repeat(64);
const req = (url: string, init: RequestInit & { token?: string } = {}) =>
  new Request(`http://127.0.0.1${url}`, { ...init, headers: { ...(init.token ? { 'x-hatch-app-token': init.token } : {}), 'content-type': 'application/json' } });
let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-app-'));
  vi.stubEnv('HATCH_DATA_DIR', dir);
  vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
  resetJobsForTest();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(dir, { recursive: true, force: true });
});

describe('GET /api/app/status', () => {
  it('비밀값이 없으면 404, 틀리면 401', async () => {
    vi.stubEnv('HATCH_APP_TOKEN', '');
    expect((await GET(req('/api/app/status', { token: TOKEN }))).status).toBe(404);
    vi.stubEnv('HATCH_APP_TOKEN', TOKEN);
    expect((await GET(req('/api/app/status', { token: 'x'.repeat(64) }))).status).toBe(401);
    expect((await GET(req('/api/app/status'))).status).toBe(401);
  });
  it('맞으면 작업 목록을 돌려준다', async () => {
    startJob(docJob('i1', 'PT 예약 앱', 'PRD'))({ ok: true });
    const res = await GET(req('/api/app/status', { token: TOKEN }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, claudeBusy: false, running: [], finished: [{ title: 'PT 예약 앱', body: 'PRD를 만들었어요' }] });
  });
});

describe('POST /api/app/ideas', () => {
  it('비밀값이 틀리면 저장하지 않는다', async () => {
    const res = await POST(req('/api/app/ideas', { method: 'POST', token: 'x'.repeat(64), body: JSON.stringify({ text: '앱' }) }));
    expect(res.status).toBe(401);
    expect((await listIdeas()).ideas).toHaveLength(0);
  });
  it('첫 줄을 제목으로 저장하고 주소를 돌려준다', async () => {
    const res = await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: JSON.stringify({ text: 'PT 예약 앱\n빈 시간 올리기' }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const [idea] = (await listIdeas()).ideas;
    expect(idea).toMatchObject({ title: 'PT 예약 앱', memo: '빈 시간 올리기' });
    expect(body).toEqual({ ok: true, id: idea.id, path: `/ideas/${idea.id}` });
  });
  it('빈 글, 깨진 JSON, 너무 큰 본문은 400 또는 413', async () => {
    expect((await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: JSON.stringify({ text: ' ' }) }))).status).toBe(400);
    expect((await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: '{' }))).status).toBe(400);
    expect((await POST(req('/api/app/ideas', { method: 'POST', token: TOKEN, body: JSON.stringify({ text: 'a'.repeat(20_000) }) }))).status).toBe(413);
  });
});
