import { describe, expect, it } from 'vitest';

import type { UsageEntry } from '@/lib/storage';

import { formatCost, formatTokens, summarizeUsage, totalTokens } from './summary';

const e = (over: Partial<UsageEntry>): UsageEntry => ({
  v: 1, feature: 'doc', key: 'plan', ideaId: 'a', again: false, at: '2026-10-30T07:00:00.000Z', ok: true, ms: 1000,
  turns: 1, input: 0, cacheWrite: 1000, cacheRead: 0, output: 1000, costUSD: 0.1, model: 'm', promptChars: 10, ...over,
});

describe('summarizeUsage', () => {
  it('빈 장부', () => {
    expect(summarizeUsage([])).toEqual({ calls: 0, tokens: 0, cost: 0, from: null, to: null, features: [], ideas: [] });
  });

  it('전체 합계와 기간', () => {
    const s = summarizeUsage([e({ at: '2026-10-30T07:00:00.000Z' }), e({ key: 'prd', at: '2026-10-30T08:00:00.000Z', costUSD: 0.3 })]);
    expect(s).toMatchObject({ calls: 2, tokens: 4000, from: '2026-10-30T07:00:00.000Z', to: '2026-10-30T08:00:00.000Z' });
    expect(s.cost).toBeCloseTo(0.4);
  });

  it('기능별 평균, 비중, 비용 큰 순', () => {
    const s = summarizeUsage([
      e({ key: 'plan', ms: 1000, costUSD: 0.1 }),
      e({ key: 'plan', ms: 3000, costUSD: 0.1, output: 3000 }),
      e({ feature: 'tool', key: 'prd-review', costUSD: 0.8 }),
    ]);
    expect(s.features.map((f) => f.key)).toEqual(['prd-review', 'plan']);
    const plan = s.features[1];
    expect(plan).toMatchObject({ feature: 'doc', calls: 2, avgMs: 2000, avgOutput: 2000, avgTokens: 3000 });
    expect(plan.avgCost).toBeCloseTo(0.1);
    expect(plan.costShare).toBeCloseTo(0.2);
    expect(s.features[0].costShare).toBeCloseTo(0.8);
  });

  it('토큰과 비용이 null인 실패 호출은 평균에서 빼고 횟수에는 넣는다', () => {
    const s = summarizeUsage([e({}), e({ ok: false, input: null, cacheWrite: null, cacheRead: null, output: null, costUSD: null, turns: null })]);
    expect(s.features[0]).toMatchObject({ calls: 2, fails: 1, avgTokens: 2000, avgOutput: 1000 });
    expect(s.features[0].avgCost).toBeCloseTo(0.1);
  });

  it('같은 key라도 feature가 다르면 다른 줄', () => {
    const s = summarizeUsage([e({ feature: 'doc', key: 'x' }), e({ feature: 'tool', key: 'x' })]);
    expect(s.features).toHaveLength(2);
  });

  it('신호: 비용 큼은 비중 30% 이상이고 기능이 2개 이상일 때만', () => {
    const one = summarizeUsage([e({})]);
    expect(one.features[0].signals).not.toContain('heavy');
    const s = summarizeUsage([e({ key: 'a', costUSD: 0.3 }), e({ key: 'b', costUSD: 0.7 })]);
    expect(s.features.find((f) => f.key === 'a')!.signals).toContain('heavy'); // 정확히 30%
    const t = summarizeUsage([e({ key: 'a', costUSD: 0.29 }), e({ key: 'b', costUSD: 0.71 })]);
    expect(t.features.find((f) => f.key === 'a')!.signals).not.toContain('heavy');
  });

  it('신호: 여러 번 돎은 turns > 1이 하나라도 있으면, 몇 번인지도', () => {
    const s = summarizeUsage([e({ turns: 2 }), e({ turns: 1 }), e({ turns: null })]);
    expect(s.features[0]).toMatchObject({ loops: 1 });
    expect(s.features[0].signals).toContain('loops');
  });

  it('신호: 다시 만들기 잦음은 2번 이상이고 again 50% 이상', () => {
    expect(summarizeUsage([e({ again: true })]).features[0].signals).not.toContain('redo'); // 1번
    expect(summarizeUsage([e({}), e({ again: true })]).features[0].signals).toContain('redo'); // 50%
    expect(summarizeUsage([e({}), e({}), e({ again: true })]).features[0].signals).not.toContain('redo'); // 33%
  });

  it('신호: 실패 있음', () => {
    expect(summarizeUsage([e({ ok: false })]).features[0].signals).toContain('fails');
    expect(summarizeUsage([e({})]).features[0].signals).not.toContain('fails');
  });

  it('아이디어별: ideaId 있는 것만, 비용 큰 순, 마지막 사용 시각', () => {
    const s = summarizeUsage([
      e({ ideaId: 'a', costUSD: 0.1, at: '2026-10-30T07:00:00.000Z' }),
      e({ ideaId: 'a', costUSD: 0.1, at: '2026-10-30T09:00:00.000Z' }),
      e({ ideaId: 'b', costUSD: 0.5 }),
      e({ ideaId: null, costUSD: 1 }),
    ]);
    expect(s.ideas.map((i) => i.ideaId)).toEqual(['b', 'a']);
    expect(s.ideas[1]).toMatchObject({ calls: 2, tokens: 4000, lastAt: '2026-10-30T09:00:00.000Z' });
    expect(s.ideas[1].cost).toBeCloseTo(0.2);
  });

  it('ideaId를 주면 그 아이디어 호출만 계산', () => {
    const s = summarizeUsage([e({ ideaId: 'a' }), e({ ideaId: 'b' }), e({ ideaId: null })], 'a');
    expect(s.calls).toBe(1);
    expect(s.ideas.map((i) => i.ideaId)).toEqual(['a']);
  });
});

describe('표시', () => {
  it('totalTokens는 입력, 캐시 쓰기, 캐시 읽기, 출력의 합 (null은 0)', () => {
    expect(totalTokens(e({ input: 2, cacheWrite: 10, cacheRead: 5, output: 3 }))).toBe(20);
    expect(totalTokens(e({ input: null, cacheWrite: null, cacheRead: null, output: null }))).toBe(0);
  });
  it('formatTokens', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(4683)).toBe('4.7천');
    expect(formatTokens(98900)).toBe('9.9만');
    expect(formatTokens(260736)).toBe('26.1만');
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
    expect(formatTokens(9999)).toBe('1만'); // 반올림으로 10.0천이 되면 만으로 올린다
    expect(formatTokens(99999)).toBe('10만');
  });
  it('formatCost', () => {
    expect(formatCost(0.0712)).toBe('0.07달러');
    expect(formatCost(2.766)).toBe('2.77달러');
    expect(formatCost(0.004)).toBe('0.01달러 미만');
    expect(formatCost(0)).toBe('0달러');
  });
});
