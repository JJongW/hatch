import { describe, expect, it } from 'vitest';

import type { Decision, DocKey } from '../storage/types';
import { section } from '../summary/parse';
import { applyDraft, docsOf, editDoc, generate, keepCurrent, reflectDecisions, START, tasksDone, tryNext, type TryFixture, type TryState } from './flow';

const PLAN = ['## 문제', '본문', '', '## 확인 필요', '- 첫 출시 지역을 어디로 할 것인가?', '- 수요가 있는가? [확인 필요: 사용자 조사]', '', '## 메모', '- 남김'].join('\n');
const decision = (question: string, answer = '성수동'): Decision => ({
  id: 'd1',
  question,
  status: 'decided',
  answer,
  reason: '공방이 모여 있다',
  from: 'plan',
  decidedAt: '2026-11-02T00:00:00.000Z',
});
const fixture = {
  docs: Object.fromEntries((['plan', 'roadmap', 'prd', 'spec', 'data', 'dev-prompt', 'design-prompt'] as DocKey[]).map((k) => [k, k === 'plan' ? PLAN : `${k} 본문`])),
} as TryFixture;
const idea = { title: '동네 클래스', memo: '', folder: '' };

describe('reflectDecisions', () => {
  it('결정이 없으면 그대로', () => {
    expect(reflectDecisions(PLAN, [])).toBe(PLAN);
  });

  it('같은 질문 줄을 확인 필요에서 빼고 정한 것 절에 답을 넣는다', () => {
    const out = reflectDecisions(PLAN, [decision('첫 출시 지역을  어디로 할 것인가?'), { ...decision('수요가 있는가?'), status: 'deferred', answer: '' }]);
    expect(section(out, '확인 필요')).toBe('');
    expect(out).toContain('## 메모\n- 남김');
    expect(out.endsWith('## 정한 것\n- 첫 출시 지역을 어디로 할 것인가?: 성수동\n- 수요가 있는가?: 보류\n')).toBe(true);
  });

  it('제안은 기획안에 넣지 않는다 (팀이 확정하기 전)', () => {
    expect(reflectDecisions(PLAN, [{ ...decision('첫 출시 지역을 어디로 할 것인가?'), status: 'proposed' }])).toBe(PLAN);
  });

  it('근거가 더해지면 기획안은 "근거" 때문에 검토할 것, 제안은 바뀜이 아니다', () => {
    const made = generate({ ...START, idea }, 'plan', fixture);
    const ev = { id: 'e1', text: '퇴근 후 연다', source: 'interview' as const, sourceNote: '', question: '', collectedAt: '' };
    expect(docsOf({ ...made, evidence: [ev] }).find((d) => d.key === 'plan')?.changes).toEqual(['evidence']);
    expect(docsOf({ ...made, decisions: [{ ...decision('x'), status: 'proposed' }] }).find((d) => d.key === 'plan')?.stale).toBe(false);
  });

  it('다른 절의 같은 글은 남긴다', () => {
    const plan = '## 위험\n- 첫 출시 지역을 어디로 할 것인가?\n';
    expect(reflectDecisions(plan, [decision('첫 출시 지역을 어디로 할 것인가?')])).toContain('## 위험\n- 첫 출시 지역을 어디로 할 것인가?');
  });
});

describe('docsOf, generate', () => {
  it('앞 문서가 바뀌면 뒤 문서가 예전 기준이 된다', () => {
    let s = generate({ ...START, idea }, 'plan', fixture);
    s = generate(s, 'roadmap', fixture);
    expect(docsOf(s).filter((d) => d.stale)).toEqual([]);

    s = { ...s, decisions: [decision('첫 출시 지역을 어디로 할 것인가?')] };
    expect(docsOf(s).find((d) => d.key === 'plan')!.changes).toEqual(['decisions']);

    // 다시 만들면 초안으로 남고, 적용해야 지금 판이 바뀐다
    s = generate(s, 'plan', fixture);
    expect(docsOf(s).find((d) => d.key === 'plan')!.draft).not.toBeNull();
    expect(docsOf(s).find((d) => d.key === 'plan')!.stale).toBe(true);
    s = applyDraft(s, 'plan');
    const docs = docsOf(s);
    expect(docs.find((d) => d.key === 'plan')!.stale).toBe(false);
    expect(docs.find((d) => d.key === 'plan')!.draft).toBeNull();
    expect(docs.find((d) => d.key === 'roadmap')!.changes).toEqual(['doc:plan']);
    expect(docs.find((d) => d.key === 'prd')!.content).toBeNull();
  });

  it('앞 문서 없이 만들면 빠진 것 · 대신 쓴 것이 남고, 대신 쓴 문서가 바뀌어도 알린다 (실제와 같은 규칙)', () => {
    let s = generate({ ...START, idea }, 'plan', fixture);
    s = generate(s, 'spec', fixture);
    expect(docsOf(s).find((d) => d.key === 'spec')).toMatchObject({ madeWithout: ['prd', 'roadmap'], madeFrom: 'plan', changes: [] });
    s = editDoc(s, 'plan', '고친 기획안');
    expect(docsOf(s).find((d) => d.key === 'spec')!.changes).toEqual(['doc:plan']);
  });

  it('PRD는 함께 넣은 기획안이 바뀌어도 알린다 (extra)', () => {
    let s = generate({ ...START, idea }, 'plan', fixture);
    for (const k of ['roadmap', 'prd'] as DocKey[]) s = generate(s, k, fixture);
    s = editDoc(s, 'plan', '고친 기획안');
    expect(docsOf(s).find((d) => d.key === 'prd')!.changes).toEqual(['doc:plan']);
    expect(docsOf(s).find((d) => d.key === 'plan')!.editedAt).toBeDefined();
  });

  it('지금 판 유지: 초안만 사라지고 본문은 그대로, 고쳐서 적용: 고친 본문', () => {
    let s = generate({ ...START, idea }, 'roadmap', fixture);
    s = generate(s, 'roadmap', fixture);
    expect(docsOf(keepCurrent(s, 'roadmap')).find((d) => d.key === 'roadmap')).toMatchObject({ content: 'roadmap 본문', draft: null });
    expect(docsOf(applyDraft(s, 'roadmap', '내가 고침')).find((d) => d.key === 'roadmap')?.content).toBe('내가 고침');
  });
});

describe('tasksDone', () => {
  it('과제마다 마침 조건을 본다', () => {
    expect(tasksDone(START)).toEqual([false, false, false, false, false, false, false]);
    let s: TryState = { ...START, idea, context: { ...START.context, goal: '예약 전환' } };
    s = generate(s, 'plan', fixture);
    expect(tasksDone(s)).toEqual([true, true, true, false, false, false, false]);

    // 결정만 저장하고 기획안을 다시 만들지 않으면 과제 5는 아직
    s = { ...s, decisions: [decision('첫 출시 지역을 어디로 할 것인가?')], questions: { createdAt: '', labels: [], items: [] } };
    expect(tasksDone(s)[4]).toBe(false);
    s = applyDraft(generate(s, 'plan', fixture), 'plan');
    expect(tasksDone({ ...s, reviews: 2, vocRan: true })).toEqual([true, true, true, true, true, true, true]);
  });
});

describe('tryNext', () => {
  it('지금 과제와 주 행동, 그다음이 과제 목록과 같은 단계를 가리킨다', () => {
    let s: TryState = { ...START, idea };
    expect(tryNext(s)).toEqual({ task: 1, next: { kind: 'write-context' }, then: { kind: 'make-doc', doc: 'plan' } });
    s = { ...s, context: { ...s.context, goal: '예약 전환' } };
    expect(tryNext(s).next).toEqual({ kind: 'make-doc', doc: 'plan' });
    s = generate(s, 'plan', fixture);
    expect(tryNext(s)).toMatchObject({ task: 3, next: { kind: 'make-questions' }, then: { kind: 'decide' } });
    s = { ...s, questions: { createdAt: '', labels: [], items: [] } };
    expect(tryNext(s).next).toEqual({ kind: 'decide' });
    s = { ...s, decisions: [decision('첫 출시 지역을 어디로 할 것인가?')] };
    expect(tryNext(s).next).toEqual({ kind: 'check-stale', doc: 'plan' });
    s = applyDraft(generate(s, 'plan', fixture), 'plan');
    expect(tryNext(s)).toEqual({ task: 5, next: { kind: 'review-prd' }, then: { kind: 'collect-voc' } });
    expect(tryNext({ ...s, reviews: 2, vocRan: true })).toEqual({ task: -1, next: { kind: 'done' }, then: null });
  });
});

describe('tryNext 경계', () => {
  it('제안만 있으면 결정부터, 손으로 고쳐 정한 것이 빠졌으면 바뀜이 아니라 다시 만들기', () => {
    let s: TryState = { ...START, idea, context: { ...START.context, goal: 'g' } };
    s = { ...generate(s, 'plan', fixture), questions: { createdAt: '', labels: [], items: [] } };
    expect(tryNext({ ...s, decisions: [{ ...decision('첫 출시 지역을 어디로 할 것인가?'), status: 'proposed' }] }).next).toEqual({ kind: 'decide' });
    s = { ...s, decisions: [decision('첫 출시 지역을 어디로 할 것인가?')] };
    s = applyDraft(generate(s, 'plan', fixture), 'plan', '# 기획안\n정한 것 없음');
    expect(tryNext(s).next).toEqual({ kind: 'make-doc', doc: 'plan' });
  });
});
