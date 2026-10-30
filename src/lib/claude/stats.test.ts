import { describe, expect, it } from 'vitest';

import { statsOf } from './stats';

const EMPTY = { turns: null, input: null, cacheWrite: null, cacheRead: null, output: null, costUSD: null, model: null };

describe('statsOf', () => {
  it('결과가 없거나 JSON이 아니거나 null이면 모두 null', () => {
    expect(statsOf(null)).toEqual(EMPTY);
    expect(statsOf('null')).toEqual(EMPTY);
    expect(statsOf('not json')).toEqual(EMPTY);
  });

  it('usage.iterations 길이를 턴 수로 쓴다', () => {
    const out = JSON.stringify({ usage: { input_tokens: 3, iterations: [{}, {}] } });
    expect(statsOf(out)).toMatchObject({ turns: 2, input: 3 });
  });
});
