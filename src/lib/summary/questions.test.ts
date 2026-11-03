import { describe, expect, it } from 'vitest';

import type { Decision, Evidence, QuestionItem, QuestionRole, QuestionSet } from '@/lib/storage/types';

import { questionView } from './questions';

const G = (label: string, count: number) => ({ label, count, examples: [] });
const c = (label: string, question: string): QuestionItem => ({ label, kind: 'customer', role: '', question });
const o = (label: string, role: QuestionRole, question: string): QuestionItem => ({ label, kind: 'owner', role, question });
const set = (items: QuestionItem[], labels = items.map((i) => i.label)): QuestionSet => ({ createdAt: '2026-10-29T00:00:00.000Z', labels, items });
const decision = (question: string): Decision => ({
  id: 'ab12', question, status: 'decided', answer: '성수', reason: '많다', from: 'manual', decidedAt: '2026-10-29T00:00:00.000Z',
});

describe('questionView', () => {
  it('안 만들었으면 수만', () => {
    expect(questionView(null, { groups: [G('a', 3), G('b', 1)], unnamed: 2 }, [])).toEqual({
      made: false, customer: [], owner: [], decision: [], answered: 0, byEvidence: 0, byDecision: 0, newLabels: 0, unknownTotal: 6, labelTotal: 2, unnamed: 2, cut: 0, limit: 30,
    });
  });
  it('고객 · 역할 순서로 묶고 지금 수를 붙이며, 문서에서 사라진 라벨은 숨긴다', () => {
    const v = questionView(set([o('a', '법무', 'qa'), c('b', 'qb'), o('c', '개발', 'qc'), o('gone', '기획', 'qg')]), {
      groups: [G('a', 1), G('b', 2), G('c', 3)],
      unnamed: 0,
    }, []);
    expect(v.customer).toEqual([{ ...c('b', 'qb'), count: 2 }]);
    expect(v.owner.map((g) => [g.role, g.items.map((q) => q.question)])).toEqual([['개발', ['qc']], ['법무', ['qa']]]);
    expect(v.newLabels).toBe(0);
  });
  it('같은 질문(공백 무시)의 결정이 있으면 답한 것으로 뺀다', () => {
    const v = questionView(set([c('b', '첫 출시 지역은?')]), { groups: [G('b', 2)], unnamed: 0 }, [decision(' 첫  출시 지역은? ')]);
    expect(v.customer).toEqual([]);
    expect(v.answered).toBe(1);
  });
  it('근거로 답한 질문도 답한 것으로 빼고, 근거 수와 결정 수를 따로 센다', () => {
    const ev: Evidence = { id: 'e1', text: '퇴근 후 앱을 연다', source: 'interview', sourceNote: '', question: '언제 여나요?', collectedAt: '2026-11-03T00:00:00.000Z' };
    const v = questionView(set([c('a', '언제 여나요?'), c('b', '첫 출시 지역은?')]), { groups: [G('a', 1), G('b', 1)], unnamed: 0 }, [decision('첫 출시 지역은?')], [ev]);
    expect(v.customer).toEqual([]);
    expect([v.answered, v.byEvidence, v.byDecision]).toEqual([2, 1, 1]);
  });
  it('팀이 정할 것은 따로 묶는다', () => {
    const d: QuestionItem = { label: 'a', kind: 'decision', role: '', question: '범위는?' };
    const v = questionView(set([d]), { groups: [G('a', 1)], unnamed: 0 }, []);
    expect(v.decision.map((q) => q.question)).toEqual(['범위는?']);
    expect(v.customer).toEqual([]);
  });
  it('새 라벨은 30개 안에서만 세고, 31번째부터는 빠진 수', () => {
    const groups = Array.from({ length: 32 }, (_, i) => G(`l${i}`, 40 - i));
    const v = questionView(set([c('l0', 'q')]), { groups, unnamed: 0 }, []);
    expect(v.newLabels).toBe(29);
    expect(v.cut).toBe(2);
  });
});
