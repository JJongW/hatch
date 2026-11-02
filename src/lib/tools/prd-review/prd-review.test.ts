import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getToolResult } from '@/lib/storage';

import { runTool } from '../run';
import { compareRows, computePrdReview, renderPrdReview } from './compute';
import { prdReviewTool } from './index';

const here = path.dirname(fileURLToPath(import.meta.url));

const scores = (s: number) =>
  ['명확성', '실현 가능성', '측정 가능성', '사용자 가치', '위험 대응'].map((criterion) => ({ criterion, score: s, reason: '이유' }));

const out = {
  reviews: [
    { reviewer: '개발', objections: [{ issue: 'API 미정', severity: 3, suggestion: '정한다' }, { issue: '용어', severity: 1, suggestion: '통일' }], scores: scores(3) },
    { reviewer: '디자인', objections: [{ issue: '빈 상태', severity: 2, suggestion: '그린다' }], scores: scores(4) },
    { reviewer: '마케팅', objections: [], scores: scores(9) }, // 범위 밖 → 5
    { reviewer: 'CS', objections: [{ issue: '문의 경로', severity: 7, suggestion: '추가' }], scores: scores(0) }, // 7 → 3, 0 → 1
  ],
  summary: '보완 후 진행',
};

describe('prdReviewTool', () => {
  it('출력 스키마: 정상 통과 · 모르는 위원 실패 · JSON Schema 변환', () => {
    expect(prdReviewTool.outputSchema.safeParse(out).success).toBe(true);
    expect(prdReviewTool.outputSchema.safeParse({ ...out, reviews: [{ ...out.reviews[0], reviewer: '법무' }] }).success).toBe(false);
    expect(z.toJSONSchema(prdReviewTool.outputSchema)).toMatchObject({ type: 'object' });
  });
  it('점수 · 심각도를 범위로 자르고 평균을 낸다', () => {
    const r = computePrdReview(prdReviewTool.outputSchema.parse(out), null);
    expect(r.reviewers.map((v) => v.average)).toEqual([3, 4, 5, 1]);
    expect(r.criteria['명확성']).toBe(3.3); // (3+4+5+1)/4 = 3.25 → 3.3
    expect(r.overall).toBe(3.3);
    expect(r.severityCounts).toEqual({ 1: 1, 2: 1, 3: 2 });
    expect(r.reviewers[0].objections.map((o) => o.severity)).toEqual([3, 1]); // 높은 순
    expect(r.prev).toBeNull();
  });
  it('빠진 위원은 응답 없음(null)이고 평균에서 빠진다', () => {
    const r = computePrdReview(prdReviewTool.outputSchema.parse({ ...out, reviews: [out.reviews[0]] }), null);
    expect(r.reviewers.map((v) => v.reviewer)).toEqual(['개발', '디자인', '마케팅', 'CS']);
    expect(r.reviewers[1].average).toBeNull();
    expect(r.overall).toBe(3);
  });
  it('재리뷰: 이전 결과의 점수를 prev로 남기고 render가 차이를 보여 준다', () => {
    const before = computePrdReview(prdReviewTool.outputSchema.parse({ ...out, reviews: out.reviews.map((v) => ({ ...v, scores: scores(2) })) }), null);
    const after = computePrdReview(prdReviewTool.outputSchema.parse(out), before);
    expect(after.prev?.overall).toBe(2);
    const md = renderPrdReview(after);
    expect(md).toContain('전체 평균 3.3 (이전 2 → +1.3)');
  });
  it('render: 요약 → 반론 → 점수 순서, 반론 없는 위원 표시', () => {
    const md = renderPrdReview(computePrdReview(prdReviewTool.outputSchema.parse(out), null));
    const order = ['## 요약', '## 반론', '### 개발 위원', '- **심각도 3** API 미정 — 제안: 정한다', '### 마케팅 위원\n- 반론 없음', '## 점수', '- 전체 평균 3.3'];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
  });
  it('promptInput: 이전 결과가 있으면 이전 반론을 넣는다', () => {
    const before = computePrdReview(prdReviewTool.outputSchema.parse(out), null);
    expect(prdReviewTool.promptInput({}, null)).toBe('');
    expect(prdReviewTool.promptInput({}, before)).toContain('- [개발] API 미정');
  });
});

// 새 도구의 run 테스트 예시 (fake-claude 모드 + 붙여넣기 → 이어 실행). C-2~4는 이 모양을 복사한다
describe('runTool + FAKE_CLAUDE=prd-review', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
    process.env.HATCH_DATA_DIR = dir;
    process.env.HATCH_CLAUDE_BIN = path.join(here, '../../claude/fake-claude.mjs');
    process.env.FAKE_CLAUDE = 'prd-review';
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.HATCH_DATA_DIR;
    delete process.env.HATCH_CLAUDE_BIN;
    delete process.env.FAKE_CLAUDE;
  });

  it('붙여넣은 PRD를 리뷰하고, prevId로 다시 리뷰하면 전후 차이를 남긴다', async () => {
    const first = await runTool(prdReviewTool, { source: { pasted: '## 배경\nPRD 본문' }, input: {} });
    const r1 = await getToolResult(null, first.resultId);
    expect(r1?.tool).toBe('prd-review');
    expect(r1?.body).toContain('## 반론');
    expect(r1?.body).not.toContain('(이전 ');

    const second = await runTool(prdReviewTool, { source: { pasted: '## 배경\n고친 PRD' }, input: {}, prevId: first.resultId });
    const r2 = await getToolResult(null, second.resultId);
    expect(r2?.prevId).toBe(first.resultId);
    expect(r2?.body).toContain('(이전 ');
    expect(r2?.body).toContain('±0'); // 같은 fake 출력이라 차이 0

    await expect(
      runTool(prdReviewTool, { source: { pasted: 'a' }, input: {}, prevId: 'voc-20261028T000000-abcd' }),
    ).rejects.toThrow('이전 결과를 찾을 수 없어요.');
  });
});

describe('compareRows', () => {
  const first = computePrdReview(out as never, null);
  const again = computePrdReview(
    { ...out, reviews: out.reviews.map((r) => (r.reviewer === '개발' ? { ...r, scores: scores(5) } : r)) } as never,
    first,
  );

  it('이전 결과가 없거나 모양이 다르면 null', () => {
    expect(compareRows(first)).toBeNull();
    expect(compareRows(null)).toBeNull();
    expect(compareRows({ prev: 3 })).toBeNull();
  });

  it('기준 5개 + 전체, 이전 → 지금과 차이', () => {
    const rows = compareRows(again)!;
    expect(rows.map((r) => r.label)).toEqual(['명확성', '실현 가능성', '측정 가능성', '사용자 가치', '위험 대응', '전체']);
    expect(rows[0]).toEqual({ label: '명확성', before: 3.3, now: 3.8, delta: 0.5 });
    expect(rows[5].delta).toBe(0.5);
  });

  it('그대로면 0, 한쪽이 응답 없음이면 차이 없음', () => {
    const same = computePrdReview(out as never, first);
    expect(compareRows(same)![0].delta).toBe(0);
    const missing = { ...again, criteria: { ...again.criteria, 명확성: null } };
    expect(compareRows(missing)![0]).toEqual({ label: '명확성', before: 3.3, now: null, delta: null });
  });
});
