import 'server-only';

import { randomUUID } from 'node:crypto';

// 맥 앱 알림용 작업 목록 (spec 2026-11-04-macos-app §3-2). 서버 메모리라 서버를 다시 켜면 빈다.
// globalThis에 두는 건 Server Action과 Route Handler가 모듈을 따로 읽어도 같은 목록을 보게 하려고
export const FINISHED_MAX = 20;

export type JobInfo = { ideaId: string | null; title: string; doing: string; doneText: string; failText: string; path: string };
export type RunningJob = { id: string; ideaId: string | null; title: string; doing: string; startedAt: string };
export type FinishedJob = { id: string; ideaId: string | null; title: string; body: string; ok: boolean; path: string; at: string };
export type JobEnd = { ok: true; path?: string } | { ok: false; message: string };

type Store = { running: Map<string, RunningJob>; finished: FinishedJob[] };
type WithStore = typeof globalThis & { __hatchJobs?: Store };

const store = (): Store => ((globalThis as WithStore).__hatchJobs ??= { running: new Map(), finished: [] });

export function startJob(info: JobInfo): (end: JobEnd) => void {
  const id = randomUUID();
  const s = store();
  s.running.set(id, { id, ideaId: info.ideaId, title: info.title, doing: info.doing, startedAt: new Date().toISOString() });
  let ended = false;
  return (end) => {
    if (ended) return;
    ended = true;
    s.running.delete(id);
    s.finished.unshift({
      id,
      ideaId: info.ideaId,
      title: info.title,
      body: end.ok ? info.doneText : `${info.failText} ${end.message}`,
      ok: end.ok,
      path: (end.ok && end.path) || info.path,
      at: new Date().toISOString(),
    });
    s.finished.length = Math.min(s.finished.length, FINISHED_MAX);
  };
}

export const jobsSnapshot = () => ({ running: [...store().running.values()], finished: [...store().finished] });

export const resetJobsForTest = () => {
  delete (globalThis as WithStore).__hatchJobs;
};

/** 받침이 있으면 '을', 없으면(영문 이름 포함) '를' */
const eulReul = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '을' : '를';
};

const made = (label: string, ideaId: string, ideaTitle: string): JobInfo => ({
  ideaId,
  title: ideaTitle,
  doing: `${label} 만드는 중`,
  doneText: `${label}${eulReul(label)} 만들었어요`,
  failText: `${label}${eulReul(label)} 만들지 못했어요.`,
  path: `/ideas/${ideaId}`,
});

export const docJob = (ideaId: string, ideaTitle: string, docLabel: string) => made(docLabel, ideaId, ideaTitle);
export const questionsJob = (ideaId: string, ideaTitle: string) => made('확인 질문', ideaId, ideaTitle);

const toolPath = (toolKey: string, ideaId: string | null, resultId?: string) => {
  const q = new URLSearchParams();
  if (ideaId) q.set('idea', ideaId);
  if (resultId) q.set('result', resultId);
  const s = q.toString();
  return `/tools/${toolKey}${s ? `?${s}` : ''}`;
};

export const toolResultPath = (toolKey: string, ideaId: string | null, resultId: string) => toolPath(toolKey, ideaId, resultId);

export const toolJob = (toolKey: string, toolLabel: string, ideaId: string | null, ideaTitle: string | null): JobInfo => ({
  ideaId,
  title: ideaTitle ?? toolLabel,
  doing: `${toolLabel} 실행 중`,
  doneText: `${toolLabel} 결과가 나왔어요`,
  failText: `${toolLabel}${eulReul(toolLabel)} 실행하지 못했어요.`,
  path: toolPath(toolKey, ideaId),
});
