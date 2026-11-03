// 흐름 체험(/try) 상태. 서버에 쓰지 않고 브라우저 메모리에서만 바뀐다 (spec 2026-11-02-try §4)
// 화면 컴포넌트와 같은 모양(Doc, Decision, QuestionSet)으로 만들어 실제 상세 화면을 그대로 쓴다
import { norm } from '../summary/parse';
import { docInputs, sourceOfInput } from '../storage/doc-inputs';
import { DOC_STEPS, EMPTY_CONTEXT, type Decision, type Doc, type DocChange, type DocKey, type Evidence, type IdeaContext, type QuestionSet } from '../storage/types';

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

/** 만든 문서: 본문, 만들 때의 입력 조각(실제 저장의 inputs와 같은 키), 다시 만든 판(적용 전), 손으로 고쳤나 */
type Made = { content: string; inputs: Record<string, string>; without?: DocKey[]; from?: DocKey | 'idea'; draft?: { content: string; inputs: Record<string, string>; at: string }; edited?: boolean };

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

/** 입력 조각 (storage/docs.ts hashesFor와 같은 키). 'idea'는 아이디어 · 결정 · 근거 세 조각 */
function inputsFor(s: TryState, sources: (DocKey | 'idea')[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const src of new Set(sources)) {
    if (src === 'idea') {
      out.idea = JSON.stringify([s.idea, s.context]);
      out.decisions = JSON.stringify(settled(s.decisions).map((d) => [d.question, d.status, d.answer]));
      out.evidence = JSON.stringify(s.evidence.map((e) => [e.text, e.source, e.sourceNote]));
    } else out[`doc:${src}`] = s.made[src]?.content ?? '';
  }
  return out;
}

const recommended = (key: DocKey) => {
  const step = DOC_STEPS.find((d) => d.key === key)!;
  return [step.from, ...(step.extra ?? [])];
};

/** 실제와 같은 규칙: 권장 입력과 실제로 쓴 입력을 모두 본다 (빠졌던 문서가 생겨도, 대신 쓴 문서가 바뀌어도 알림) */
const changesOf = (s: TryState, key: DocKey, made: Made): DocChange[] => {
  const now = inputsFor(s, [...recommended(key), ...Object.keys(made.inputs).map(sourceOfInput)]);
  return Object.keys(now).filter((k) => (made.inputs[k] ?? '') !== now[k]) as DocChange[];
};

export function docsOf(s: TryState): Doc[] {
  return DOC_STEPS.map((step) => {
    const made = s.made[step.key];
    const changes = made ? changesOf(s, step.key, made) : [];
    return {
      ...step,
      content: made?.content ?? null,
      stale: changes.length > 0,
      changes,
      editedAt: made?.edited ? new Date(0).toISOString() : undefined, // 체험은 시각을 안 남긴다. 고쳤는지만 본다
      draft: made?.draft ? { content: made.draft.content, generatedAt: made.draft.at } : null,
      versions: [],
      ...(made?.without?.length ? { madeWithout: made.without, ...(made.from ? { madeFrom: made.from } : {}) } : {}),
    };
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

/** 처음 만들면 바로 문서, 이미 있으면 초안으로 (실제 생성과 같은 규칙: 지금 판을 덮지 않는다) */
export function generate(s: TryState, key: DocKey, fixture: TryFixture): TryState {
  const content = key === 'plan' ? reflectDecisions(fixture.docs.plan, s.decisions) : fixture.docs[key];
  const made = s.made[key];
  // 앞 문서가 없어도 만든다 (실제와 같은 규칙). 실제로 쓴 입력만 남기고, 빠진 것은 "○○ 없이 만들었어요"로 보인다
  const plan = docInputs(key, (k) => !!s.made[k]);
  const inputs = inputsFor(s, [plan.from, ...plan.extra]);
  const missing = plan.missing.length ? { without: plan.missing, from: plan.missing.includes(DOC_STEPS.find((d) => d.key === key)!.from as DocKey) ? plan.from : undefined } : {};
  const next: Made = made ? { ...made, draft: { content, inputs, at: new Date().toISOString() } } : { content, inputs, ...missing };
  return { ...s, made: { ...s.made, [key]: next } };
}

/** 초안 적용 (body를 주면 고쳐서 적용) · 지금 판 유지 */
export function applyDraft(s: TryState, key: DocKey, body?: string): TryState {
  const made = s.made[key];
  if (!made?.draft) return s;
  const edited = body !== undefined && body.trim() !== made.draft.content.trim();
  return { ...s, made: { ...s.made, [key]: { content: edited ? body : made.draft.content, inputs: made.draft.inputs, edited } } };
}

export function keepCurrent(s: TryState, key: DocKey): TryState {
  const made = s.made[key];
  if (!made?.draft) return s;
  const { draft: _drop, ...rest } = made; // eslint-disable-line @typescript-eslint/no-unused-vars -- 체험은 버린 초안을 남길 곳이 없다 (저장 안 함)
  return { ...s, made: { ...s.made, [key]: rest } };
}

/** 손으로 고친 본문. 입력은 그대로라 예전 기준 표시는 바뀌지 않는다 */
export function editDoc(s: TryState, key: DocKey, content: string): TryState {
  const made = s.made[key];
  return made ? { ...s, made: { ...s.made, [key]: { ...made, content, edited: true } } } : s;
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
