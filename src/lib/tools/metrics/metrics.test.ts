import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getToolResult } from '@/lib/storage';

import { runTool } from '../run';
import { computeMetrics, durationDays, renderMetrics, sampleSize } from './compute';
import { metricsTool } from './index';

const here = path.dirname(fileURLToPath(import.meta.url));

const m = (name: string) => ({ name, definition: '분자 ÷ 분모 (주간)', why: '이유' });
const out = {
  coreMetric: m('예약 전환율'),
  secondaryMetrics: [m('a'), m('b'), m('c'), m('d'), m('e')], // 5개 → 4개
  guardrails: [m('오류율')],
  experiments: [
    { hypothesis: '추천을 위에 두면 예약이 는다', variants: ['대조군', '변형 A'], primaryMetric: '예약 전환율' },
    { hypothesis: '두 번째', variants: ['대조군', 'A', 'B'], primaryMetric: '예약 전환율' },
    { hypothesis: '세 번째', variants: ['대조군', 'A'], primaryMetric: 'x' }, // 3개 → 2개
  ],
};
const full = { baselineRate: 10, minEffect: 10, dailyTraffic: 1000 };
const none = { baselineRate: null, minEffect: null, dailyTraffic: null };

describe('metricsTool 스키마', () => {
  it('입력: 빈 칸은 null, 숫자 · 쉼표 · % 허용', () => {
    expect(metricsTool.inputSchema.parse({})).toEqual(none);
    expect(metricsTool.inputSchema.parse({ baselineRate: '', minEffect: ' ', dailyTraffic: '' })).toEqual(none);
    expect(metricsTool.inputSchema.parse({ baselineRate: '10%', minEffect: '10', dailyTraffic: '1,000' })).toEqual(full);
  });
  it('입력: 범위 밖이면 한국어 메시지로 실패', () => {
    const msg = (input: Record<string, string>) => metricsTool.inputSchema.safeParse(input).error?.issues[0]?.message;
    expect(msg({ baselineRate: 'abc' })).toBe('기준 전환율은 0보다 크고 100보다 작은 숫자(%)로 적어 주세요.');
    expect(msg({ baselineRate: '100' })).toContain('기준 전환율은');
    expect(msg({ minEffect: '0' })).toBe('최소 감지 효과는 0보다 큰 숫자(%)로 적어 주세요.');
    expect(msg({ dailyTraffic: '10.5' })).toBe('하루 실험 대상 수는 1 이상의 정수로 적어 주세요.');
    expect(msg({ baselineRate: '60', minEffect: '80' })).toContain('100%를 넘어요');
  });
  it('출력: 정상 통과 · 보조 지표 부족 · 변형 1개 실패 · JSON Schema 변환', () => {
    expect(metricsTool.outputSchema.safeParse(out).success).toBe(true);
    expect(metricsTool.outputSchema.safeParse({ ...out, secondaryMetrics: [m('a')] }).success).toBe(false);
    expect(metricsTool.outputSchema.safeParse({ ...out, experiments: [{ ...out.experiments[0], variants: ['대조군'] }] }).success).toBe(false);
    expect(z.toJSONSchema(metricsTool.outputSchema)).toMatchObject({ type: 'object' });
  });
});

describe('compute', () => {
  it('표본 크기 기준값: p1 10% · 효과 10% → 변형당 14,751명', () => {
    expect(sampleSize(0.1, 0.1)).toBe(14751);
  });
  it('기간은 올림: 14,751 × 2 ÷ 1,000 = 29.502 → 30일', () => {
    expect(durationDays(14751, 2, 1000)).toBe(30);
    expect(durationDays(500, 2, 1000)).toBe(1);
    expect(durationDays(1000, 2, 1000)).toBe(2); // 나누어떨어지면 그대로
  });
  it('개수를 잘라 쓰고 실험마다 변형 수로 기간을 낸다', () => {
    const r = computeMetrics(out, full);
    expect(r.samplePerVariant).toBe(14751);
    expect(r.secondary).toHaveLength(4);
    expect(r.experiments.map((e) => e.days)).toEqual([30, 45]); // 14,751×3÷1,000 = 44.253 → 45
  });
  it('입력이 없으면 계산하지 않는다', () => {
    expect(computeMetrics(out, none).samplePerVariant).toBeNull();
    const noTraffic = computeMetrics(out, { ...full, dailyTraffic: null });
    expect(noTraffic.samplePerVariant).toBe(14751);
    expect(noTraffic.experiments[0].days).toBeNull();
  });
});

describe('render', () => {
  it('제목 순서와 계산값', () => {
    const md = renderMetrics(computeMetrics(out, full));
    const order = ['## 핵심 지표', '- **예약 전환율**', '## 보조 지표', '## 가드레일', '## 실험 조건', '- 변형당 표본: 14,751명', '## 실험 설계', '### 실험 1', '- 필요 기간: 30일 (14,751명 × 2개 ÷ 하루 1,000명)', '### 실험 2'];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
    expect(md).not.toContain('### 실험 3');
  });
  it('빠진 입력은 [확인 필요]로 남긴다', () => {
    const md = renderMetrics(computeMetrics(out, { ...none, dailyTraffic: 1000 }));
    expect(md).toContain('- 기준 전환율 [확인 필요: 기준 전환율]');
    expect(md).toContain('- 변형당 표본: [확인 필요: 기준 전환율, 최소 감지 효과]');
    expect(md).toContain('- 필요 기간: [확인 필요: 기준 전환율, 최소 감지 효과]');
    const md2 = renderMetrics(computeMetrics(out, { ...full, dailyTraffic: null }));
    expect(md2).toContain('- 필요 기간: [확인 필요: 하루 실험 대상 수]');
  });
  it('promptInput: 입력 조건을 프롬프트 블록으로', () => {
    expect(metricsTool.promptInput(full, null)).toContain('- 기준 전환율 10%');
    expect(metricsTool.promptInput(none, null)).toContain('[확인 필요: 하루 실험 대상 수]');
  });
});

describe('runTool + FAKE_CLAUDE=metrics', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
    process.env.HATCH_DATA_DIR = dir;
    process.env.HATCH_CLAUDE_BIN = path.join(here, '../../claude/fake-claude.mjs');
    process.env.FAKE_CLAUDE = 'metrics';
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.HATCH_DATA_DIR;
    delete process.env.HATCH_CLAUDE_BIN;
    delete process.env.FAKE_CLAUDE;
  });

  it('붙여넣은 PRD로 지표를 설계하고 표본 · 기간을 계산해 저장한다', async () => {
    const { resultId } = await runTool(metricsTool, {
      source: { pasted: '## 배경\nPRD 본문' },
      input: { baselineRate: '10', minEffect: '10', dailyTraffic: '1000' },
    });
    const r = await getToolResult(null, resultId);
    expect(r?.tool).toBe('metrics');
    expect(r?.body).toContain('- 변형당 표본: 14,751명');
    expect(r?.body).toContain('- 필요 기간: 30일');
  });
  it('입력 칸이 틀리면 claude 전에 거절한다', async () => {
    await expect(runTool(metricsTool, { source: { pasted: 'a' }, input: { baselineRate: '120' } })).rejects.toThrow('기준 전환율은');
  });
});
