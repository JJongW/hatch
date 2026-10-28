export type Idea = {
  id: string;
  title: string;
  memo: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
};

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
export const IDEA_FILE_VERSION = 1;
