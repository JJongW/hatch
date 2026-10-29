import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getToolResult } from '@/lib/storage';

import { runTool } from '../run';
import { computeVoc, renderVoc } from './compute';
import { vocTool } from './index';

const here = path.dirname(fileURLToPath(import.meta.url));

const lines = ['결제가 실패해요', '검색이 느려요', '환불이 안 돼요', '알림이 많아요', '결제 버튼이 안 보여요', '앱이 꺼져요'];
const out = {
  topics: [
    { name: '결제', description: '결제 · 환불 문제' },
    { name: '검색', description: '검색 품질' },
    { name: '알림', description: '알림 피로' },
  ],
  items: [
    { line: 1, topic: '결제', severity: 5 },
    { line: 2, topic: '검색', severity: 9 }, // 범위 밖 → 5
    { line: 3, topic: '결제', severity: 3 },
    { line: 4, topic: '알림', severity: 0 }, // 범위 밖 → 1
    { line: 5, topic: '없는 주제', severity: 4 }, // 없는 주제 → 분류 안 됨
    // 6번 줄 빠짐 → 분류 안 됨
    { line: 99, topic: '결제', severity: 5 }, // 없는 줄 → 무시
  ],
};

describe('vocTool 스키마', () => {
  it('입력: 빈 줄을 빼고 줄 목록으로 바꾼다', () => {
    expect(vocTool.inputSchema.parse({ voc: '  가 \n\n나\n   \n다' })).toEqual({ lines: ['가', '나', '다'] });
  });
  it('입력: 비었거나 200줄을 넘으면 한국어 메시지로 실패', () => {
    const msg = (v: unknown) => vocTool.inputSchema.safeParse(v).error?.issues[0]?.message;
    expect(msg({ voc: '\n \n' })).toBe('VOC를 한 줄 이상 붙여넣어 주세요.');
    expect(msg({})).toBe('VOC를 붙여넣어 주세요.');
    expect(msg({ voc: Array.from({ length: 201 }, (_, i) => `v${i}`).join('\n') })).toBe('입력이 너무 길어요 (최대 200줄).');
    expect(vocTool.inputSchema.safeParse({ voc: Array.from({ length: 200 }, (_, i) => `v${i}`).join('\n\n') }).success).toBe(true);
  });
  it('출력: 정상 통과 · 주제 9개 실패 · JSON Schema 변환', () => {
    expect(vocTool.outputSchema.safeParse(out).success).toBe(true);
    const nine = Array.from({ length: 9 }, (_, i) => ({ name: `t${i}`, description: 'd' }));
    expect(vocTool.outputSchema.safeParse({ ...out, topics: nine }).success).toBe(false);
    expect(vocTool.outputSchema.safeParse({ ...out, items: [{ line: 1.5, topic: '결제', severity: 3 }] }).success).toBe(false);
    expect(z.toJSONSchema(vocTool.outputSchema)).toMatchObject({ type: 'object' });
  });
  it('promptInput: 1부터 번호를 붙인다', () => {
    expect(vocTool.promptInput({ lines: ['가', '나'] }, null)).toContain('1. 가\n2. 나');
  });
});

describe('computeVoc', () => {
  const r = computeVoc(out, { lines });
  it('심각도를 1~5로 자르고 건수 · 평균 · 점수(건수 × 평균)를 낸다', () => {
    expect(r.topics.map((t) => [t.name, t.count, t.average, t.score])).toEqual([
      ['결제', 2, 4, 8],
      ['검색', 1, 5, 5],
      ['알림', 1, 1, 1],
    ]);
    expect(r.topics.map((t) => t.rank)).toEqual([1, 2, 3]);
    expect(r.total).toBe(6);
  });
  it('빠진 줄 · 없는 주제는 분류 안 됨으로 센다', () => {
    expect(r.unclassified.count).toBe(2);
    expect(r.unclassified.top).toEqual([
      { line: 5, text: '결제 버튼이 안 보여요', severity: 4 },
      { line: 6, text: '앱이 꺼져요', severity: null },
    ]);
  });
  it('대표 VOC는 심각도 높은 순 3개, 같으면 줄 번호 순', () => {
    const many = computeVoc(
      { topics: [out.topics[0]], items: [2, 5, 3, 5].map((severity, i) => ({ line: i + 1, topic: '결제', severity })) },
      { lines: ['a', 'b', 'c', 'd'] },
    );
    expect(many.topics[0].top.map((v) => v.line)).toEqual([2, 4, 3]);
    expect(many.topics[0].average).toBe(3.8); // 15/4 = 3.75
    expect(many.topics[0].score).toBe(15);
  });
  it('빈 주제는 평균 없음 · 점수 0으로 맨 뒤, 같은 점수는 건수 → 입력 순', () => {
    const e = computeVoc(
      {
        topics: [{ name: '빈', description: 'd' }, { name: 'A', description: 'd' }, { name: 'B', description: 'd' }, { name: 'A', description: '중복' }],
        items: [
          { line: 1, topic: 'A', severity: 4 },
          { line: 2, topic: 'B', severity: 2 },
          { line: 3, topic: 'B', severity: 2 },
        ],
      },
      { lines: ['x', 'y', 'z'] },
    );
    expect(e.topics.map((t) => [t.rank, t.name, t.score, t.average])).toEqual([
      [1, 'B', 4, 2],
      [1, 'A', 4, 4], // 같은 점수 → 같은 순위
      [3, '빈', 0, null],
    ]);
    expect(e.unclassified.count).toBe(0);
  });
  it('items가 비면 모두 분류 안 됨', () => {
    const e = computeVoc({ topics: out.topics, items: [] }, { lines });
    expect(e.unclassified.count).toBe(6);
    expect(e.topics.every((t) => t.count === 0)).toBe(true);
  });
});

describe('renderVoc', () => {
  it('요약 → 출발 순위 → 볼 것 → 주제별 대표 VOC → 분류 안 됨 순서, "점수"는 쓰지 않는다', () => {
    const md = renderVoc(computeVoc(out, { lines }));
    const order = [
      '## 요약\nVOC 6건, 주제 3개, 분류 안 됨 2건',
      '## 출발 순위\n건수 × 평균 심각도로 매긴 출발점이에요. 실제 우선순위는 아래 질문을 보고 정해요.',
      '- **1** 결제 — 건수 2, 평균 심각도 4 (합 8)',
      '## 순위를 정하기 전에 볼 것\n- 고객군:',
      '- 제품 목표:',
      '- 해결 비용:',
      '## 주제별 대표 VOC',
      '### 1. 결제\n',
      '- **심각도 5** (1번) 결제가 실패해요',
      '## 분류 안 됨: 2건',
      '- **주제 없음** (6번) 앱이 꺼져요',
    ];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
    expect(md).not.toContain('점수');
    expect(md).not.toMatch(/\d위/);
  });
  it('분류 안 됨이 없으면 칸을 빼고, 빈 주제는 안내한다', () => {
    const md = renderVoc(computeVoc({ topics: out.topics, items: lines.map((_, i) => ({ line: i + 1, topic: '결제', severity: 2 })) }, { lines }));
    expect(md).not.toContain('## 분류 안 됨');
    expect(md).toContain('평균 심각도 없음');
    expect(md).toContain('- 이 주제로 분류된 VOC 없음');
  });
});

describe('runTool + FAKE_CLAUDE=voc', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
    process.env.HATCH_DATA_DIR = dir;
    process.env.HATCH_CLAUDE_BIN = path.join(here, '../../claude/fake-claude.mjs');
    process.env.FAKE_CLAUDE = 'voc';
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.HATCH_DATA_DIR;
    delete process.env.HATCH_CLAUDE_BIN;
    delete process.env.FAKE_CLAUDE;
  });

  it('문서 없이 실행해 계산 결과를 저장한다', async () => {
    const { resultId } = await runTool(vocTool, { source: { none: true }, input: { voc: 'a\nb\n\nc\nd\ne\nf' } });
    const r = await getToolResult(null, resultId);
    expect(r?.tool).toBe('voc');
    expect(r?.source).toBe('none');
    expect(r?.body).toContain('### 1. 결제');
    expect(r?.body).toContain('## 분류 안 됨: 2건'); // 5번 없는 주제 + 6번 빠짐
  });
  it('붙여넣은 맥락 문서와 함께 실행한다', async () => {
    const { resultId } = await runTool(vocTool, { source: { pasted: '## 기획안\n본문' }, input: { voc: 'a\nb' } });
    expect((await getToolResult(null, resultId))?.source).toBe('pasted');
  });
  it('200줄을 넘으면 claude 실행 전에 거절한다', async () => {
    const voc = Array.from({ length: 201 }, (_, i) => `v${i}`).join('\n');
    await expect(runTool(vocTool, { source: { none: true }, input: { voc } })).rejects.toThrow('입력이 너무 길어요 (최대 200줄).');
    await expect(runTool(vocTool, { source: { none: true }, input: { voc: '' } })).rejects.toThrow('VOC를 한 줄 이상 붙여넣어 주세요.');
  });
});
