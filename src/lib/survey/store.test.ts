import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SURVEY_VERSION } from './questions';
import { isSurveyReady, saveResponse, SurveyStoreError } from './store';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.env.SUPABASE_URL = 'https://abcdefghijklmnopqrst.supabase.co/';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
});

describe('isSurveyReady', () => {
  it('주소와 키가 둘 다 있어야 true', () => {
    expect(isSurveyReady()).toBe(true);
    process.env.SUPABASE_SECRET_KEY = '  ';
    expect(isSurveyReady()).toBe(false);
  });
});

describe('saveResponse', () => {
  it('표에 한 줄을 넣는다: 주소, 머리, 본문', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    await saveResponse({ role: '마케터' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://abcdefghijklmnopqrst.supabase.co/rest/v1/survey_responses');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ apikey: 'sb_secret_test', 'Content-Type': 'application/json', Prefer: 'return=minimal' });
    expect(JSON.parse(init.body)).toEqual({ version: SURVEY_VERSION, answers: { role: '마케터' } });
  });

  it('예전 service_role 키(JWT)면 Authorization도 보낸다', async () => {
    process.env.SUPABASE_SECRET_KEY = 'eyJhbGciOi.payload.sig';
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    await saveResponse({});
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer eyJhbGciOi.payload.sig');
  });

  it('2xx가 아니거나 네트워크 오류면 SurveyStoreError, 응답 본문은 로그에만', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"message":"relation does not exist"}', { status: 404 }));
    await expect(saveResponse({})).rejects.toBeInstanceOf(SurveyStoreError);
    expect(console.error).toHaveBeenCalled();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(saveResponse({})).rejects.toBeInstanceOf(SurveyStoreError);
  });

  it('연결 정보가 없으면 요청하지 않고 실패', async () => {
    delete process.env.SUPABASE_URL;
    await expect(saveResponse({})).rejects.toBeInstanceOf(SurveyStoreError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
