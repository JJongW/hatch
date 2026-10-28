export type Idea = {
  id: string;
  title: string;
  memo: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
};

export type DocKey = 'plan' | 'curriculum' | 'prd' | 'spec' | 'dev-prompt' | 'design-prompt';

export type Doc = {
  key: DocKey;
  label: string;
  file: string;
  /** 파일이 없으면 null */
  content: string | null;
};

/** 문서 체인 순서. B 단계에서 이 순서대로 생성한다. */
export const DOC_STEPS: ReadonlyArray<Omit<Doc, 'content'>> = [
  { key: 'plan', label: '기획안', file: 'plan.md' },
  { key: 'curriculum', label: '커리큘럼', file: 'curriculum.md' },
  { key: 'prd', label: 'PRD', file: 'prd.md' },
  { key: 'spec', label: '기능명세', file: 'spec.md' },
  { key: 'dev-prompt', label: '개발 프롬프트', file: 'dev-prompt.md' },
  { key: 'design-prompt', label: '디자인 프롬프트', file: 'design-prompt.md' },
];

/** idea.md 머리말 형식 버전. 형식을 바꾸면 올리고 읽을 때 변환한다. */
export const IDEA_FILE_VERSION = 1;
