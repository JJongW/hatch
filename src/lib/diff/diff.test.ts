import { describe, expect, it } from 'vitest';

import { diffSummary, lineDiff } from '.';

describe('lineDiff', () => {
  it('같으면 모두 same', () => {
    expect(lineDiff('a\nb', 'a\nb').map((l) => l.kind)).toEqual(['same', 'same']);
  });
  it('가운데 줄을 바꾸면 뺀 줄 · 더한 줄', () => {
    expect(lineDiff('a\nb\nc', 'a\nx\nc')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'add', text: 'x' },
      { kind: 'same', text: 'c' },
    ]);
  });
  it('빈 판에서 더하기', () => {
    expect(lineDiff('', 'a').filter((l) => l.kind === 'add').map((l) => l.text)).toEqual(['a']);
  });
});

describe('diffSummary', () => {
  const before = '# 기획안\n\n## 문제\n노쇼\n\n## 목표\n예약 늘리기\n\n## 위험\n공급';
  it('바뀐 절 · 새 절 · 없어진 절 · 줄 수', () => {
    const after = '# 기획안\n\n## 문제\n노쇼\n\n## 목표\n예약 20% 늘리기\n\n## 확인한 근거\n가격부터 본다';
    expect(diffSummary(before, after)).toEqual({ added: 3, removed: 3, changed: ['목표'], addedSections: ['확인한 근거'], removedSections: ['위험'] });
  });
  it('같으면 비어 있다', () => {
    expect(diffSummary(before, before)).toEqual({ added: 0, removed: 0, changed: [], addedSections: [], removedSections: [] });
  });
});
