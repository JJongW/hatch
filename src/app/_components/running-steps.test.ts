import { describe, expect, it } from 'vitest';

import { formatElapsed, visibleSteps } from './running-steps';

describe('visibleSteps', () => {
  it('첫 단계는 바로, 이후 예상 시간에 고르게 하나씩', () => {
    expect(visibleSteps(0, 5)).toBe(1);
    expect(visibleSteps(11, 5)).toBe(1);
    expect(visibleSteps(12, 5)).toBe(2);
    expect(visibleSteps(48, 5)).toBe(5);
  });

  it('예상 시간을 넘겨도 마지막 단계에 머문다', () => {
    expect(visibleSteps(300, 5)).toBe(5);
  });

  it('단계가 없거나 시간이 음수여도 깨지지 않는다', () => {
    expect(visibleSteps(10, 0)).toBe(0);
    expect(visibleSteps(-3, 4)).toBe(1);
  });
});

describe('formatElapsed', () => {
  it('1분 전후로 나눠 쓴다', () => {
    expect(formatElapsed(9)).toBe('9초');
    expect(formatElapsed(72)).toBe('1분 12초');
    expect(formatElapsed(125)).toBe('2분 05초');
  });
});
