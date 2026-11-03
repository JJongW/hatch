// 흐름 체험(/try) 상태. 서버에 쓰지 않고 브라우저 메모리에서만 바뀐다 (spec 2026-11-02-try §4)
// 화면 컴포넌트와 같은 모양(Doc, Decision, QuestionSet)으로 만들어 실제 상세 화면을 그대로 쓴다
import { norm } from '../summary/parse';
import { DOC_STEPS, EMPTY_CONTEXT, type Decision, type Doc, type DocKey, type Evidence, type IdeaContext, type QuestionSet } from '../storage/types';

export type ToolInfo = { label: string; description: string; continueLabel?: string };

/** 미리 만든 예시 결과 (demo-data의 샘플 아이디어) */
export type TryFixture = {
  idea: { title: string; memo: string };
  docs: Record<DocKey, string>;
  questions: QuestionSet;
  /** 첫 리뷰, 고친 판 리뷰 */
  prdReviews: [string, string];
  voc: { input: string; body: string; data: unknown };
  tools: { prdReview: ToolInfo; voc: ToolInfo };
};

/** 만든 문서: 본문과 만들 때의 입력. 입력이 지금과 다르면 '앞 문서가 바뀌었어요' */
type Made = { content: string; source: string };

export type TryState = {
  idea: { title: string; memo: string; folder: string } | null;
  context: IdeaContext;
  decisions: Decision[];
  /** 확인한 근거. 결정 · 기획안 입력과 따로 (실제 저장과 같은 규칙) */
  evidence: Evidence[];
  made: Partial<Record<DocKey, Made>>;
  questions: QuestionSet | null;
  /** PRD 리뷰를 돌린 횟수 (0~2) */
  reviews: number;
  vocRan: boolean;
};

export const START: TryState = { idea: null, context: EMPTY_CONTEXT, decisions: [], evidence: [], made: {}, questions: null, reviews: 0, vocRan: false };

const TAIL = /\s*\[확인 필요[^\]]*\]\s*$/;
const DECIDED = '정한 것';
/** 기획안에 들어가는 결정: 정함 · 보류. 제안은 팀이 확정하기 전이라 넣지 않는다 (storage/docs.ts projectBlock과 같은 규칙) */
const settled = (decisions: Decision[]) => decisions.filter((d) => d.status !== 'proposed');

/** 기획안 입력: 아이디어, 맥락, 결정 (실제 체인처럼 결정이 바뀌면 기획안이 예전 기준이 된다) */
const sourceOf = (s: TryState, key: DocKey): string | null => {
  const from = DOC_STEPS.find((d) => d.key === key)!.from;
  if (from === 'idea') return JSON.stringify([s.idea, s.context, settled(s.decisions).map((d) => [d.question, d.status, d.answer])]);
  return s.made[from]?.content ?? null;
};

export function docsOf(s: TryState): Doc[] {
  return DOC_STEPS.map((step) => {
    const made = s.made[step.key];
    return { ...step, content: made?.content ?? null, stale: !!made && made.source !== sourceOf(s, step.key) };
  });
}

/**
 * 결정을 예시 기획안에 넣는다: 같은 질문 줄은 '확인 필요'에서 빼고, 끝에 '정한 것' 절로 답을 보인다.
 * 참가자가 고른 답이 그대로 보여야 반영을 알아챌 수 있다 (설문 H3)
 */
export function reflectDecisions(plan: string, all: Decision[]): string {
  const decisions = settled(all);
  if (decisions.length === 0) return plan;
  const asked = new Set(decisions.map((d) => norm(d.question)));
  const lines = plan.split('\n');
  let inUnknowns = false;
  const kept = lines.filter((l) => {
    if (l.startsWith('## ')) inUnknowns = l.slice(3).trim() === '확인 필요';
    return !(inUnknowns && l.startsWith('- ') && asked.has(norm(l.slice(2).replace(TAIL, ''))));
  });
  const done = decisions.map((d) => `- ${norm(d.question)}: ${d.status === 'decided' ? norm(d.answer) : '보류'}`);
  return `${kept.join('\n').trimEnd()}\n\n## ${DECIDED}\n${done.join('\n')}\n`;
}

export function generate(s: TryState, key: DocKey, fixture: TryFixture): TryState {
  const content = key === 'plan' ? reflectDecisions(fixture.docs.plan, s.decisions) : fixture.docs[key];
  return { ...s, made: { ...s.made, [key]: { content, source: sourceOf(s, key) ?? '' } } };
}

/** 손으로 고친 본문. 입력은 그대로라 예전 기준 표시는 바뀌지 않는다 */
export function editDoc(s: TryState, key: DocKey, content: string): TryState {
  const made = s.made[key];
  return made ? { ...s, made: { ...s.made, [key]: { ...made, content } } } : s;
}

/** 설문 과제 7개(TASKS 순서)를 마쳤나 (spec §2 마침 조건) */
export function tasksDone(s: TryState): boolean[] {
  const plan = s.made.plan?.content ?? '';
  return [
    s.idea !== null,
    Object.values(s.context).some((v) => v.trim() !== ''),
    !!s.made.plan,
    s.questions !== null,
    settled(s.decisions).length > 0 && plan.includes(`## ${DECIDED}`),
    s.reviews >= 2,
    s.vocRan,
  ];
}
