'use server';

import { redirect } from 'next/navigation';

import { parseResponse } from '@/lib/survey/schema';
import { isSurveyReady, saveResponse, SurveyStoreError } from '@/lib/survey/store';

export type SurveyState = {
  /** 화면 위 오류 한 줄 (저장 실패, 연결 없음) */
  error?: string;
  /** 문항 id → 문구 */
  fieldErrors?: Record<string, string>;
};

// 데모(읽기 전용)에서도 설문 제출만은 연다. Hatch 파일은 건드리지 않고 Supabase에만 쓴다 (spec 2026-11-02 §1)
export async function submitSurveyAction(_prev: SurveyState, formData: FormData): Promise<SurveyState> {
  if (!isSurveyReady()) return { error: '설문 저장소가 연결되지 않았어요. 진행자에게 알려 주세요.' };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('answers') ?? ''));
  } catch {
    return { error: '답을 읽지 못했어요. 다시 제출해 주세요.' };
  }
  const parsed = parseResponse(raw);
  if (!parsed.ok) return { error: '답하지 않은 문항이 있어요.', fieldErrors: parsed.errors };

  try {
    await saveResponse(parsed.answers);
  } catch (e) {
    if (e instanceof SurveyStoreError) return { error: '저장하지 못했어요. 잠시 뒤 다시 제출해 주세요.' };
    throw e;
  }
  redirect('/survey/done');
}
