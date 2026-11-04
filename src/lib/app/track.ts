import 'server-only';

import { isClaudeBusy } from '@/lib/claude/run';
import { DOC_STEPS, getIdea, isValidId, type DocKey } from '@/lib/storage';
import type { ToolSource } from '@/lib/tools/types';

import { docJob, questionsJob, startJob, toolJob } from './jobs';

// claude가 바쁘면 이번 요청은 BUSY로 거절된다. 거절은 작업이 아니라 알리지 않는다
const ideaOf = async (id: string) => (isValidId(id) ? getIdea(id).catch(() => null) : null);

export async function trackDoc(id: string, key: DocKey) {
  if (isClaudeBusy()) return null;
  const idea = await ideaOf(id);
  const label = DOC_STEPS.find((s) => s.key === key)?.label;
  return idea && label ? startJob(docJob(idea.id, idea.title, label)) : null;
}

export async function trackQuestions(id: string) {
  if (isClaudeBusy()) return null;
  const idea = await ideaOf(id);
  return idea ? startJob(questionsJob(idea.id, idea.title)) : null;
}

export async function trackTool(tool: { key: string; label: string }, source: ToolSource) {
  if (isClaudeBusy()) return null;
  const idea = 'ideaId' in source ? await ideaOf(source.ideaId) : null;
  return startJob(toolJob(tool.key, tool.label, idea?.id ?? null, idea?.title ?? null));
}
