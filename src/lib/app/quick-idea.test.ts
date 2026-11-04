import { describe, expect, it } from 'vitest';

import { QUICK_MAX, splitQuick } from './quick-idea';

describe('splitQuick', () => {
  it('첫 줄은 제목, 나머지는 메모', () => {
    expect(splitQuick('  PT 예약 앱\n트레이너가 빈 시간을 올린다\n\n회원이 고른다 ')).toEqual({
      title: 'PT 예약 앱',
      memo: '트레이너가 빈 시간을 올린다\n\n회원이 고른다',
    });
    expect(splitQuick('한 줄만')).toEqual({ title: '한 줄만', memo: '' });
  });
  it('빈 글, 글이 아닌 값, 너무 긴 글은 거절', () => {
    expect(splitQuick('   ')).toEqual({ error: '아이디어를 적어 주세요.' });
    expect(splitQuick(42)).toEqual({ error: '아이디어를 적어 주세요.' });
    expect(splitQuick('a'.repeat(QUICK_MAX + 1))).toEqual({ error: '2,000자까지 적을 수 있어요.' });
  });
});
