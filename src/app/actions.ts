'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createIdea, StorageError, trashIdea, updateIdea } from '@/lib/storage';

export type FormState = {
  error?: string;
  /** 오류일 때 입력을 되살리기 위해 (React 19 폼은 제출 후 비워진다) */
  values?: { title: string; memo: string };
  /** 성공할 때마다 바뀌는 값 — 폼을 다시 그리는 key로 쓴다 */
  savedAt?: number;
};

const readForm = (formData: FormData) => ({
  title: String(formData.get('title') ?? ''),
  memo: String(formData.get('memo') ?? ''),
});

// storage가 사용자용으로 던진 문구만 그대로, 나머지(파일 시스템 · 파서)는 한 줄 안내로
function toMessage(e: unknown) {
  if (e instanceof StorageError) return e.message;
  return '저장하지 못했어요. 데이터 폴더(HATCH_DATA_DIR)와 idea.md 형식을 확인해 주세요.';
}

function revalidateIdeas() {
  revalidatePath('/');
  revalidatePath('/ideas', 'layout');
}

export async function createIdeaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readForm(formData);
  try {
    await createIdea(values);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export async function updateIdeaAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = readForm(formData);
  try {
    await updateIdea(id, values);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { values, savedAt: Date.now() };
}

export async function trashIdeaAction(id: string) {
  await trashIdea(id);
  revalidateIdeas();
  redirect('/ideas');
}
