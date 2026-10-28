import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { computePrdReview, renderPrdReview } from './compute';
import { prdReviewTool } from './index';

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
