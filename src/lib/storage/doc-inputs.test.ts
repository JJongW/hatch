import { describe, expect, it } from 'vitest';

import { docInputs } from './doc-inputs';
import type { DocKey } from './types';

const with_ = (...keys: DocKey[]) => (k: DocKey) => keys.includes(k);

describe('docInputs', () => {
  it('다 있으면 권장 입력 그대로, 빠진 것 없음', () => {
    expect(docInputs('prd', with_('plan', 'roadmap'))).toEqual({ from: 'roadmap', extra: ['plan'], missing: [] });
  });
  it('앞 문서가 없으면 가장 가까운 있는 앞 문서, 없으면 아이디어', () => {
    expect(docInputs('prd', with_('plan'))).toEqual({ from: 'plan', extra: [], missing: ['roadmap'] });
    expect(docInputs('spec', with_('plan'))).toEqual({ from: 'plan', extra: [], missing: ['prd', 'roadmap'] });
    expect(docInputs('roadmap', with_())).toEqual({ from: 'idea', extra: [], missing: ['plan'] });
  });
  it('빠진 함께 보는 문서도 알린다', () => {
    expect(docInputs('prd', with_('roadmap'))).toEqual({ from: 'roadmap', extra: [], missing: ['plan'] });
    expect(docInputs('design-prompt', with_('spec'))).toEqual({ from: 'spec', extra: [], missing: ['data'] });
  });
});
