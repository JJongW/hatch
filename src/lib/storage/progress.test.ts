import { describe, expect, it } from 'vitest';

import { DOC_STEPS, progressOf, type Doc } from '.';

const docsWith = (...keys: string[]): Doc[] =>
  DOC_STEPS.map((s) => ({ ...s, content: keys.includes(s.key) ? '내용' : null, stale: false }));

describe('progressOf', () => {
  it('문서가 없으면 "아이디어"', () => {
    expect(progressOf(docsWith())).toBe('아이디어');
  });

  it('파일이 있는 마지막 단계 이름', () => {
    expect(progressOf(docsWith('plan', 'prd'))).toBe('PRD');
  });

  it('중간이 비어도 가장 뒤의 단계', () => {
    expect(progressOf(docsWith('design-prompt'))).toBe('디자인 프롬프트');
  });
});
