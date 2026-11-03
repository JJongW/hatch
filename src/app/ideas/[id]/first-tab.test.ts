import { describe, expect, it } from 'vitest';

import { DOC_STEPS } from '@/lib/storage/types';

import { firstTab } from './first-tab';

import type { Doc } from '@/lib/storage';

const docs = (filled: string[]): Doc[] =>
  DOC_STEPS.map((s) => ({ ...s, content: filled.includes(s.key) ? '본문' : null, stale: false, changes: [], draft: null, versions: [] }));

describe('firstTab', () => {
  it('다음 행동이 문서를 가리키면 그 문서', () => {
    expect(firstTab(docs(['plan']), { kind: 'make-doc', doc: 'roadmap' })).toBe('roadmap');
  });
  it('가리키는 문서가 없으면 내용 있는 마지막 문서', () => {
    expect(firstTab(docs(['plan', 'roadmap']), { kind: 'done' })).toBe('roadmap');
  });
  it('내용이 하나도 없으면 기획안', () => {
    expect(firstTab(docs([]), { kind: 'collect-voc' })).toBe('plan');
  });
});
