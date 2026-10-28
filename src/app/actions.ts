'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ChainError, generateDoc } from '@/lib/chain';
import { createIdea, isValidId, StorageError, trashIdea, updateDocBody, updateIdea, type DocKey } from '@/lib/storage';
import { ChainError as ToolError, runTool, TOOLS, type ToolKey, type ToolSource } from '@/lib/tools';

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

export type DocActionState = { error?: string; savedAt?: number };

// 체인 · storage가 사용자용으로 던진 문구만 그대로, 나머지는 한 줄 안내로
const chainMessage = (e: unknown) =>
  e instanceof ChainError || e instanceof StorageError
    ? e.message
    : '문서를 만들지 못했어요. 서버 로그를 확인해 주세요.';

// 1~2분 걸리는 긴 Server Action. 끝날 때까지 클라이언트가 pending 상태로 기다린다
export async function generateDocAction(id: string, key: DocKey): Promise<DocActionState> {
  try {
    await generateDoc(id, key);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] generateDoc', e);
    return { error: chainMessage(e) };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export async function updateDocAction(
  id: string,
  key: DocKey,
  _prev: DocActionState,
  formData: FormData,
): Promise<DocActionState> {
  try {
    await updateDocBody(id, key, String(formData.get('body') ?? ''));
  } catch (e) {
    return { error: toMessage(e) };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export type ToolActionState = { error?: string; resultId?: string; ideaId?: string | null };
const FRAME_FIELDS = new Set(['mode', 'ideaId', 'docKey', 'pasted', 'prevId']);

// 1~2분 걸리는 긴 Server Action. 도구 입력 칸은 FRAME_FIELDS 밖의 문자열 칸 전부
export async function runToolAction(key: ToolKey, _prev: ToolActionState, formData: FormData): Promise<ToolActionState> {
  const tool = TOOLS[key];
  if (!tool) return { error: '아직 쓸 수 없는 도구예요.' };
  const get = (k: string) => String(formData.get(k) ?? '');
  const mode = get('mode');
  const source: ToolSource =
    mode === 'none'
      ? { none: true }
      : mode === 'pasted'
        ? { pasted: get('pasted') }
        : { ideaId: get('ideaId'), docKey: get('docKey') as DocKey };
  if ('ideaId' in source && !isValidId(source.ideaId)) return { error: '입력 문서를 골라 주세요.' };
  const input: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (!FRAME_FIELDS.has(k) && !k.startsWith('$') && typeof v === 'string') input[k] = v;
  });
  try {
    const { resultId, ideaId } = await runTool(tool, { source, input, prevId: get('prevId') || null });
    revalidatePath(`/tools/${key}`);
    return { resultId, ideaId };
  } catch (e) {
    if (!(e instanceof ToolError)) console.error('[hatch] runTool', e);
    return {
      error:
        e instanceof ToolError || e instanceof StorageError ? e.message : '도구를 실행하지 못했어요. 서버 로그를 확인해 주세요.',
    };
  }
}
