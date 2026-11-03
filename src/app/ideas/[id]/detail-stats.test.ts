import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Decision, type Doc, type DocKey } from '@/lib/storage';
import type { QuestionView, Summary } from '@/lib/summary';

import { detailStats } from './detail-stats';

const docsWith = (...keys: DocKey[]): Doc[] =>
  DOC_STEPS.map((s) => ({ ...s, content: keys.includes(s.key) ? '내용' : null, stale: false, changes: [], draft: null, versions: [] }));

const line = (label: string) => ({ label, question: `${label}?`, count: 1 }) as QuestionView['customer'][number];

const view = (over: Partial<QuestionView> = {}): QuestionView => ({
  made: true,
  customer: [],
  owner: [],
  decision: [],
  answered: 0,
  byEvidence: 0,
  byDecision: 0,
  newLabels: 0,
  unknownTotal: 0,
  labelTotal: 0,
  unnamed: 0,
  cut: 0,
  limit: 30,
  ...over,
});

const decision = (status: Decision['status']): Decision =>
  ({ id: 'a1b2', question: 'q', status, answer: status === 'decided' ? 'a' : '', reason: 'r', from: 'manual' }) as Decision;

const decisions = (open: string[], openMore: number, recorded: Decision[]): Summary['decisions'] => ({ open, openMore, recorded });

describe('detailStats', () => {
  it('문서: 완료 수와 앞 문서가 바뀐 수', () => {
    const docs = docsWith('plan', 'roadmap', 'prd').map((d) => (d.key === 'roadmap' ? { ...d, stale: true } : d));
    expect(detailStats(docs, null, view(), decisions([], 0, [])).docs).toEqual({ done: 3, total: 7, stale: 1 });
  });

  it('생성 중인 문서는 바뀜으로 세지 않는다', () => {
    const docs = docsWith('plan', 'roadmap').map((d) => (d.key === 'roadmap' ? { ...d, stale: true } : d));
    expect(detailStats(docs, 'roadmap', view(), decisions([], 0, [])).docs.stale).toBe(0);
  });

  it('확인 질문: 고객과 담당자 질문을 더해 남은 수', () => {
    const v = view({ customer: [line('a'), line('b')], owner: [{ role: '기획', items: [line('c')] }, { role: '개발', items: [line('d'), line('e')] }], answered: 1 });
    expect(detailStats(docsWith(), null, v, decisions([], 0, [])).questions).toEqual({ made: true, open: 5, answered: 1, unknownTotal: 0 });
  });

  it('질문을 아직 안 만들었으면 [확인 필요] 수를 넘긴다', () => {
    const q = detailStats(docsWith(), null, view({ made: false, unknownTotal: 33 }), decisions([], 0, [])).questions;
    expect(q).toEqual({ made: false, open: 0, answered: 0, unknownTotal: 33 });
  });

  it('결정: 정한 것만 세고, 안 정한 것은 화면에 안 보이는 수까지', () => {
    const d = detailStats(docsWith(), null, view(), decisions(['q1', 'q2'], 3, [decision('decided'), decision('deferred')])).decisions;
    expect(d).toEqual({ decided: 1, deferred: 1, proposed: 0, open: 5 });
  });

  it('제안은 정한 것으로 세지 않는다', () => {
    const d = detailStats(docsWith(), null, view(), decisions([], 0, [decision('proposed'), decision('decided')])).decisions;
    expect([d.decided, d.proposed]).toEqual([1, 1]);
  });

  it('근거는 결정과 따로 세고, 결정에 연결된 수를 센다', () => {
    const ev = (id: string) => ({ id, text: 't', source: 'interview' as const, sourceNote: '', question: '', collectedAt: '' });
    const linked = { ...decision('decided'), evidenceIds: ['e1'] };
    const s = detailStats(docsWith(), null, view(), decisions([], 0, [linked]), [ev('e1'), ev('e2')]);
    expect(s.evidence).toEqual({ total: 2, linked: 1 });
    expect(s.decisions.decided).toBe(1);
  });

  it('팀이 정할 질문도 남은 질문에 센다', () => {
    expect(detailStats(docsWith(), null, view({ decision: [line('x')] }), decisions([], 0, [])).questions.open).toBe(1);
  });
});
