export type Idea = {
  id: string;
  title: string;
  memo: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
  context: IdeaContext;
};

export type IdeaContext = { customer: string; goal: string; constraints: string; facts: string };

/** 맥락 칸 순서 · 이름. 화면과 프롬프트 블록이 같이 쓴다 */
export const CONTEXT_FIELDS: ReadonlyArray<{ key: keyof IdeaContext; label: string }> = [
  { key: 'customer', label: '목표 고객' },
  { key: 'goal', label: '목표 지표' },
  { key: 'constraints', label: '제약' },
  { key: 'facts', label: '이미 아는 사실' },
];

export const EMPTY_CONTEXT: IdeaContext = { customer: '', goal: '', constraints: '', facts: '' };
export const CONTEXT_MAX = 1000;

export type DocKey = 'plan' | 'roadmap' | 'prd' | 'spec' | 'dev-prompt' | 'design-prompt';

export type DocStep = { key: DocKey; label: string; file: string; from: DocKey | 'idea' };

export type Doc = DocStep & {
  /** 머리말을 뺀 본문. 파일이 없으면 null */
  content: string | null;
  /** 만들 때의 입력 해시 ≠ 지금 앞 문서 해시 */
  stale: boolean;
};

/** 문서 체인 순서. 각 단계는 from(앞 단계)을 입력으로 만든다. */
export const DOC_STEPS: ReadonlyArray<DocStep> = [
  { key: 'plan', label: '기획안', file: 'plan.md', from: 'idea' },
  { key: 'roadmap', label: '개발 로드맵', file: 'roadmap.md', from: 'plan' },
  { key: 'prd', label: 'PRD', file: 'prd.md', from: 'roadmap' },
  { key: 'spec', label: '기능명세', file: 'spec.md', from: 'prd' },
  { key: 'dev-prompt', label: '개발 프롬프트', file: 'dev-prompt.md', from: 'spec' },
  { key: 'design-prompt', label: '디자인 프롬프트', file: 'design-prompt.md', from: 'spec' },
];

export const DOC_FILE_VERSION = 1;

/** idea.md 머리말 형식 버전. 형식을 바꾸면 올리고 읽을 때 변환한다. */
// 2: context 머리말 추가 (1판은 빈 맥락으로 읽음)
export const IDEA_FILE_VERSION = 2;

export type Decision = {
  /** 4자 랜덤 (목록 안에서만 유일) */
  id: string;
  question: string;
  status: 'decided' | 'deferred';
  /** 보류면 '' */
  answer: string;
  reason: string;
  /** 기획안 질문에 답함 / 직접 추가 */
  from: 'plan' | 'manual';
  /** ISO 8601, 고칠 때 갱신 */
  decidedAt: string;
};
export type DecisionInput = Pick<Decision, 'question' | 'status' | 'answer' | 'reason' | 'from'>;
export const DECISION_FILE_VERSION = 1;
