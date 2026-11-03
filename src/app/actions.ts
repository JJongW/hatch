'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ChainError, generateDoc } from '@/lib/chain';
import { DEMO_MESSAGE, isDemo } from '@/lib/demo';
import { makeQuestions } from '@/lib/questions';
import {
  CONTEXT_FIELDS,
  createIdea,
  getDocs,
  getIdea,
  getQuestions,
  getShareState,
  isValidId,
  listDecisions,
  saveShareState,
  removeDecision,
  saveDecision,
  saveEvidence,
  StorageError,
  trashIdea,
  updateDocBody,
  updateIdea,
  updateIdeaContext,
  type DecisionInput,
  type DocKey,
  type EvidenceInput,
  type IdeaContext,
} from '@/lib/storage';
import { buildSharePayload } from '@/lib/share/build';

import { decisionValues, evidenceValues } from './_components/form-values';
import { sendPublish, ShareError } from '@/lib/share/client';
import { newShareToken } from '@/lib/share/token';
import { ChainError as ToolError, runTool, TOOLS, type ToolKey, type ToolSource } from '@/lib/tools';

export type FormState = {
  error?: string;
  /** 오류일 때 입력을 되살리기 위해 (React 19 폼은 제출 후 비워진다) */
  values?: { title: string; memo: string; folder: string };
  /** 성공할 때마다 바뀌는 값 — 폼을 다시 그리는 key로 쓴다 */
  savedAt?: number;
};

const readForm = (formData: FormData) => ({
  title: String(formData.get('title') ?? ''),
  memo: String(formData.get('memo') ?? ''),
  folder: String(formData.get('folder') ?? ''),
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
  if (isDemo()) return { error: DEMO_MESSAGE, values };
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
  if (isDemo()) return { error: DEMO_MESSAGE, values };
  try {
    await updateIdea(id, values);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { values, savedAt: Date.now() };
}

export type ContextState = { error?: string; values?: IdeaContext; savedAt?: number };

export async function saveContextAction(id: string, _prev: ContextState, formData: FormData): Promise<ContextState> {
  const values = Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, String(formData.get(f.key) ?? '')])) as IdeaContext;
  if (isDemo()) return { error: DEMO_MESSAGE, values };
  try {
    await updateIdeaContext(id, values);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export type DecisionState = { error?: string; values?: DecisionInput; savedAt?: number };

/** savedId: 방금 저장한 근거 — '이 근거로 결정 적기'에 연결한다 */
export type EvidenceState = { error?: string; values?: EvidenceInput; savedAt?: number; savedId?: string };

export async function saveEvidenceAction(id: string, evidenceId: string | null, _prev: EvidenceState, formData: FormData): Promise<EvidenceState> {
  const values = evidenceValues(formData);
  if (isDemo()) return { error: DEMO_MESSAGE, values };
  try {
    const saved = await saveEvidence(id, values, evidenceId ?? undefined);
    revalidateIdeas();
    return { savedAt: Date.now(), savedId: saved.id };
  } catch (e) {
    return { error: toMessage(e), values };
  }
}

export async function saveDecisionAction(
  id: string,
  decisionId: string | null,
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const values = decisionValues(formData);
  if (isDemo()) return { error: DEMO_MESSAGE, values };
  try {
    await saveDecision(id, values, decisionId ?? undefined);
  } catch (e) {
    return { error: toMessage(e), values };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export async function removeDecisionAction(id: string, decisionId: string) {
  if (isDemo()) return;
  await removeDecision(id, decisionId);
  revalidateIdeas();
}

export async function trashIdeaAction(id: string): Promise<{ error?: string }> {
  if (isDemo()) return {}; // 상단 안내가 읽기 전용임을 알린다
  // 공유 중이면 밖의 사본부터 지운다. 못 지우면 휴지통으로 옮기지 않는다 (옮기면 화면에서 끌 길이 없다)
  try {
    const share = await getShareState(id);
    if (share?.token) {
      await sendPublish({ op: 'delete', token: share.token });
      await saveShareState(id, { token: null, closedAt: new Date().toISOString() });
    }
  } catch (e) {
    const why = e instanceof ShareError ? e.message : '공유 상태를 읽지 못했어요.';
    return { error: `공유 링크를 지우지 못해 휴지통으로 옮기지 않았어요. ${why}` };
  }
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
  if (isDemo()) return { error: DEMO_MESSAGE };
  try {
    await generateDoc(id, key);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] generateDoc', e);
    return { error: chainMessage(e) };
  }
  revalidateIdeas();
  return { savedAt: Date.now() };
}

export type QuestionsState = { error?: string; savedAt?: number };

// 1분쯤 걸리는 긴 Server Action. 문서 생성과 같은 claude 잠금을 쓴다
export async function makeQuestionsAction(id: string): Promise<QuestionsState> {
  if (isDemo()) return { error: DEMO_MESSAGE };
  try {
    await makeQuestions(id);
  } catch (e) {
    if (!(e instanceof ChainError)) console.error('[hatch] makeQuestions', e);
    return {
      error: e instanceof ChainError || e instanceof StorageError ? e.message : '질문을 만들지 못했어요. 서버 로그를 확인해 주세요.',
    };
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
  if (isDemo()) return { error: DEMO_MESSAGE };
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
  if (isDemo()) return { error: DEMO_MESSAGE };
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

export type ShareActionState = { error?: string; doneAt?: number };
export type ShareOp = 'publish' | 'refresh' | 'new' | 'off';

// 공유 (spec 2026-11-03-hosted-po §3). publish = 새로 공유, refresh = 같은 링크에 지금 내용, new = 옛 링크를 끄고 새 링크, off = 끄기
export async function shareAction(id: string, op: ShareOp): Promise<ShareActionState> {
  if (isDemo() || !isValidId(id)) return { error: DEMO_MESSAGE };
  try {
    const state = await getShareState(id);
    const current = state?.token ?? null;
    // 이미 공유 중인데 '공유하기'가 오면(탭 두 개, 낡은 화면) 새 토큰을 만들지 않고 같은 링크를 새로고침한다.
    // 그러지 않으면 옛 링크가 맥에 기록 없이 살아남아 끌 수 없다
    const mode: ShareOp = op === 'publish' && current ? 'refresh' : op;
    if (mode === 'off' || mode === 'new') {
      if (current) {
        await sendPublish({ op: 'delete', token: current });
        // 지운 즉시 기록한다. 뒤의 올리기가 실패해도 맥에 죽은 토큰이 '공유 중'으로 남지 않게
        await saveShareState(id, { token: null, closedAt: new Date().toISOString() });
      }
      if (mode === 'off') {
        revalidatePath(`/ideas/${id}`);
        return { doneAt: Date.now() };
      }
    }
    const idea = await getIdea(id);
    if (!idea) return { error: '아이디어를 찾지 못했어요.' };
    const [docs, questions, decisions] = await Promise.all([getDocs(id), getQuestions(id).catch(() => null), listDecisions(id)]);
    const payload = buildSharePayload({ idea, docs, questions, decisions });
    const token = mode === 'refresh' && current ? current : newShareToken();
    await sendPublish({ op: 'put', token, ideaId: id, payload });
    const now = new Date().toISOString();
    await saveShareState(id, { token, createdAt: mode === 'refresh' && state?.token ? state.createdAt : now, publishedAt: now });
    revalidatePath(`/ideas/${id}`);
    return { doneAt: Date.now() };
  } catch (e) {
    if (e instanceof ShareError || e instanceof StorageError) return { error: e.message };
    console.error('[share] 공유 실패', e);
    return { error: '공유하지 못했어요. 서버 로그를 확인해 주세요.' };
  }
}
