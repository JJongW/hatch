import 'server-only';

import { SURVEY_VERSION, type Participant } from './questions';
import type { SurveyAnswers } from './schema';

// 설문 응답은 Supabase 표 survey_responses에 쌓는다 (supabase/survey.sql). Hatch의 다른 데이터는 파일이라 여기만 예외다.
// 쓰기만 하므로 supabase-js 없이 REST 한 번. 읽기나 다른 표가 생기면 supabase-js로 바꾼다

export class SurveyStoreError extends Error {}

const config = () => {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && key ? { url, key } : null;
};

/** 연결 정보(주소, 비밀 키)가 둘 다 있나. 없으면 화면이 제출을 막는다 */
export const isSurveyReady = () => config() !== null;

export async function saveResponse(participant: Participant, answers: SurveyAnswers) {
  const c = config();
  if (!c) throw new SurveyStoreError('설문 저장소가 연결되지 않았어요.');
  // 새 비밀 키(sb_secret_)는 apikey만, 예전 service_role 키(JWT)는 Authorization도 있어야 한다
  const headers: Record<string, string> = { apikey: c.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  if (c.key.startsWith('eyJ')) headers.Authorization = `Bearer ${c.key}`;

  let res: Response;
  try {
    res = await fetch(`${c.url}/rest/v1/survey_responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ participant, version: SURVEY_VERSION, answers }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000), // 응답이 없으면 제출 버튼이 계속 돌지 않게
    });
  } catch (e) {
    console.error('[survey] Supabase에 닿지 못함', e);
    throw new SurveyStoreError('저장하지 못했어요.');
  }
  if (!res.ok) {
    console.error('[survey] Supabase 저장 실패', res.status, await res.text().catch(() => ''));
    throw new SurveyStoreError('저장하지 못했어요.');
  }
}
