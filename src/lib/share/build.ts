import { CONTEXT_FIELDS, type Decision, type Doc, type IdeaContext, type QuestionSet } from '@/lib/storage/types';

import type { SharePayload } from './payload';

// 공유 본문 만들기 (spec §3-3 허용 목록). 여기서 고른 칸만 밖으로 나간다:
// 이전 판, 사용량, 생성 중 표시, 도구 결과, 폴더, 머리말은 받지도 않는다
type Input = {
  idea: { title: string; memo: string; context: IdeaContext };
  docs: Doc[];
  questions: QuestionSet | null;
  decisions: Decision[];
};

export function buildSharePayload({ idea, docs, questions, decisions }: Input): SharePayload {
  return {
    v: 1,
    title: idea.title,
    memo: idea.memo,
    context: CONTEXT_FIELDS.filter((f) => idea.context[f.key].trim()).map((f) => ({ label: f.label, value: idea.context[f.key] })),
    docs: docs.flatMap((d) => (d.content ? [{ label: d.label, content: d.content }] : [])),
    questions: (questions?.items ?? []).map((q) => ({
      group: q.kind === 'customer' ? '고객에게 물을 것' : `${q.role} 담당자에게 확인할 것`,
      question: q.question,
    })),
    decisions: decisions.map((d) => ({ question: d.question, status: d.status, answer: d.answer, reason: d.reason })),
  };
}

/** 올리기 전 PO에게 보여 줄 개수 */
export const shareCounts = (p: SharePayload) => ({ docs: p.docs.length, questions: p.questions.length, decisions: p.decisions.length });
