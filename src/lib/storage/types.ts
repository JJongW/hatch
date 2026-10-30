export type Idea = {
  id: string;
  title: string;
  memo: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
  context: IdeaContext;
  /** 폴더(묶음) 이름. '' = 미분류 */
  folder: string;
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

export type DocKey = 'plan' | 'roadmap' | 'prd' | 'spec' | 'data' | 'dev-prompt' | 'design-prompt';

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
  { key: 'data', label: '데이터 구성', file: 'data.md', from: 'spec' },
  { key: 'dev-prompt', label: '개발 프롬프트', file: 'dev-prompt.md', from: 'spec' },
  { key: 'design-prompt', label: '디자인 프롬프트', file: 'design-prompt.md', from: 'data' },
];

export const DOC_FILE_VERSION = 1;

/** idea.md 머리말 형식 버전. 형식을 바꾸면 올리고 읽을 때 변환한다. */
// 2: context 머리말 추가 (1판은 빈 맥락으로 읽음)
// 3: folder 머리말 추가 (2판 이하는 미분류로 읽음)
export const IDEA_FILE_VERSION = 3;

export type Decision = {
  /** 4자 랜덤 (목록 안에서만 유일) */
  id: string;
  question: string;
  status: 'decided' | 'deferred';
  /** 보류면 '' */
  answer: string;
  reason: string;
  /** 기획안 질문에 답함 / 직접 추가 / 확인 질문에 답함 */
  from: 'plan' | 'manual' | 'question';
  /** ISO 8601, 고칠 때 갱신 */
  decidedAt: string;
};
export type DecisionInput = Pick<Decision, 'question' | 'status' | 'answer' | 'reason' | 'from'>;
export const DECISION_FILE_VERSION = 1;

/** 확인 질문 담당 역할 (화면 묶음 순서) */
export const QUESTION_ROLES = ['기획', '개발', '디자인', '데이터', '법무', '운영'] as const;
export type QuestionRole = (typeof QUESTION_ROLES)[number];

export type QuestionItem = {
  /** 문서의 `[확인 필요: 라벨]` 라벨 그대로 */
  label: string;
  /** 고객에게 물을 것 / 담당자에게 확인할 것 */
  kind: 'customer' | 'owner';
  /** owner면 역할, customer면 '' */
  role: QuestionRole | '';
  /** 한 문장, 최대 QUESTION_MAX자 (결정 "정할 것" 한도와 같음) */
  question: string;
};
export type QuestionSet = {
  /** ISO 8601 */
  createdAt: string;
  /** 만들 때 넣은 라벨 (새 라벨 감지용) */
  labels: string[];
  items: QuestionItem[];
};
export const QUESTION_MAX = 200;
export const QUESTION_FILE_VERSION = 1;

/** 사용량 장부 (`$HATCH_DATA_DIR/usage.jsonl`) — 호출 한 번에 한 줄 */
export type UsageFeature = 'doc' | 'questions' | 'tool';
/** 호출하는 쪽이 넘기는 꼬리표. key = DocKey · 'questions' · ToolKey */
export type UsageTag = { feature: UsageFeature; key: string; ideaId: string | null; again: boolean };
export type UsageEntry = UsageTag & {
  v: 1;
  /** ISO 8601, 호출이 끝난 시각 */
  at: string;
  ok: boolean;
  ms: number;
  /** 모델 호출 횟수 = usage.iterations 길이. 1보다 크면 여러 번 돎 (num_turns는 --json-schema면 늘 2라 쓰지 않는다) */
  turns: number | null;
  input: number | null;
  cacheWrite: number | null;
  cacheRead: number | null;
  output: number | null;
  /** total_cost_usd — 정가 기준 추정, 구독은 실제 청구 아님 */
  costUSD: number | null;
  model: string | null;
  /** 프롬프트 길이만. 내용은 남기지 않는다 */
  promptChars: number;
};
export const USAGE_FILE_VERSION = 1;
