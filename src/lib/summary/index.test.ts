import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Decision, type Doc, type DocKey } from '@/lib/storage/types';

import { summarize, vocEvidence, type SummaryInput } from './index';

const PLAN = '## 문제\n퇴근 후 클래스를 찾기 어렵다. [확인 필요: 불편 빈도]\n\n둘째 문단\n\n## 확인 필요\n- 지역은? [확인 필요: 지역]\n';
const ALL: Partial<Record<DocKey, string>> = { plan: PLAN, roadmap: 'r', prd: 'p', spec: 's', data: 'm', 'dev-prompt': 'd', 'design-prompt': 'g' };

const docsWith = (content: Partial<Record<DocKey, string>>, stale: DocKey[] = []): Doc[] =>
  DOC_STEPS.map((s) => ({ ...s, content: content[s.key] ?? null, stale: stale.includes(s.key), changes: stale.includes(s.key) ? ['unknown'] : [], draft: null, versions: [] }));

const input = (over: Partial<SummaryInput> = {}): SummaryInput => ({
  idea: { title: '퇴근 후 원데이 클래스', memo: '' },
  docs: docsWith(ALL),
  running: null,
  voc: { total: 30, top: '예약' },
  reviewedPrd: true,
  decisions: [],
  ...over,
});

describe('다음 행동', () => {
  it('1. 생성 중이면 기다림', () => {
    expect(summarize(input({ running: 'prd', docs: docsWith(ALL, ['spec']) })).next).toEqual({ kind: 'wait', doc: 'prd' });
  });
  it('2. 내용 있고 바뀐 문서 중 가장 앞', () => {
    expect(summarize(input({ docs: docsWith(ALL, ['spec', 'roadmap']) })).next).toEqual({ kind: 'check-stale', doc: 'roadmap' });
  });
  it('그다음: 해당하는 다음 규칙 하나 (바뀐 문서가 둘이면 둘째), 생성 중 · 다 됨이면 없음', () => {
    expect(summarize(input({ docs: docsWith(ALL, ['spec', 'roadmap']) })).then).toEqual({ kind: 'check-stale', doc: 'spec' });
    expect(summarize(input({ running: 'prd', docs: docsWith(ALL, ['spec']) })).then).toBeNull();
    expect(summarize(input({ docs: docsWith(ALL, ['roadmap']), voc: { total: 1, top: 'a' }, reviewedPrd: true })).then).toBeNull();
  });
  it('2. 내용 없는 문서의 stale은 무시', () => {
    expect(summarize(input({ docs: docsWith({ plan: PLAN }, ['roadmap']), voc: { total: 1, top: 'a' } })).next).toEqual({
      kind: 'make-doc',
      doc: 'roadmap',
    });
  });
  it('3. 기획안 없음 → 기획안 만들기', () => {
    expect(summarize(input({ docs: docsWith({}) })).next).toEqual({ kind: 'make-doc', doc: 'plan' });
  });
  it('4. VOC 없고 모르는 것 있음 → 고객 의견 모으기', () => {
    expect(summarize(input({ voc: null })).next).toEqual({ kind: 'collect-voc' });
  });
  it('4-0. 질문 목록 여부를 넘기고 아직 안 만들었으면 → 질문 정리가 고객 의견보다 먼저 (흐름 체험)', () => {
    expect(summarize(input({ voc: null, questionsMade: false })).next).toEqual({ kind: 'make-questions' });
    expect(summarize(input({ voc: null, questionsMade: true })).next).toEqual({ kind: 'collect-voc' });
  });
  it('4. VOC 없어도 모르는 것이 없으면 건너뛴다', () => {
    expect(summarize(input({ voc: null, docs: docsWith({ ...ALL, plan: '## 문제\n가' }) })).next).toEqual({ kind: 'done' });
  });
  it('5. PRD 있고 리뷰 없음 → PRD 리뷰', () => {
    expect(summarize(input({ reviewedPrd: false })).next).toEqual({ kind: 'review-prd' });
  });
  it('6. 내용 없는 첫 문서 만들기', () => {
    expect(summarize(input({ docs: docsWith({ plan: PLAN, roadmap: 'r' }) })).next).toEqual({ kind: 'make-doc', doc: 'prd' });
  });
  it('7. 전부 있음 → 끝', () => {
    expect(summarize(input()).next).toEqual({ kind: 'done' });
  });
});

describe('해결하려는 문제', () => {
  it('기획안 ## 문제 첫 문단 (확인 필요 그대로)', () => {
    expect(summarize(input()).problem).toEqual({ text: '퇴근 후 클래스를 찾기 어렵다. [확인 필요: 불편 빈도]', from: 'plan' });
  });
  it('기획안이 없으면 메모 첫 문단', () => {
    const s = summarize(input({ docs: docsWith({}), idea: { title: 't', memo: '메모 첫 줄\n\n둘째' } }));
    expect(s.problem).toEqual({ text: '메모 첫 줄', from: 'memo' });
  });
  it('메모도 없으면 제목', () => {
    expect(summarize(input({ docs: docsWith({}) })).problem).toEqual({ text: '퇴근 후 원데이 클래스', from: 'title' });
  });
});

describe('모르는 것 · 결정', () => {
  it('모든 문서에서 묶고 5개까지, 종류 수는 따로', () => {
    const many = Array.from({ length: 7 }, (_, i) => `[확인 필요: 항목${i}]`).join(' ');
    const s = summarize(input({ docs: docsWith({ ...ALL, prd: many }) }));
    expect(s.unknowns).toHaveLength(5);
    expect(s.unknownTotal).toBe(9); // 불편 빈도 · 지역 · 항목0~6
  });
  it('결정은 꼬리표를 뗀 기획안 확인 필요 항목, 최대 5개', () => {
    const plan = '## 확인 필요\n' + Array.from({ length: 6 }, (_, i) => `- 질문${i} [확인 필요: x]`).join('\n');
    const s = summarize(input({ docs: docsWith({ ...ALL, plan }) }));
    expect(s.decisions.open).toEqual(['질문0', '질문1', '질문2', '질문3', '질문4']);
  });
  it('기획안이 없으면 결정 없음', () => {
    expect(summarize(input({ docs: docsWith({}) })).decisions.open).toEqual([]);
  });
});

describe('결정 칸', () => {
  const rec = (question: string, from: Decision['from'] = 'plan'): Decision => ({
    id: question, question, status: 'decided', answer: 'a', reason: 'r', from, decidedAt: '2026-10-29T00:00:00.000Z',
  });
  const plan = '## 확인 필요\n- 지역은? [확인 필요: 지역]\n- 결제는?\n- 1\n- 2\n- 3\n- 4\n- 5\n';
  it('답한 질문은 아직 안 정한 것에서 빠진다 (공백 차이 무시)', () => {
    const s = summarize(input({ docs: docsWith({ ...ALL, plan }), decisions: [rec('  지역은?  ')] }));
    expect(s.decisions.open).toEqual(['결제는?', '1', '2', '3', '4']);
    expect(s.decisions.openMore).toBe(1);
    expect(s.decisions.recorded.map((d) => d.question)).toEqual(['  지역은?  ']);
  });
  it('직접 추가한 결정은 recorded에만, 기획안 없으면 open은 비어 있다', () => {
    const s = summarize(input({ docs: docsWith({}), decisions: [rec('가격은?', 'manual')] }));
    expect(s.decisions).toEqual({ open: [], openMore: 0, recorded: [rec('가격은?', 'manual')] });
  });
});

describe('vocEvidence', () => {
  it('total · 1위 주제 이름', () => {
    expect(vocEvidence({ total: 42, topics: [{ name: '예약 실패' }, { name: '가격' }] })).toEqual({ total: 42, top: '예약 실패' });
  });
  it.each([null, undefined, 'x', {}, { total: '3', topics: [] }, { total: 3, topics: [] }, { total: 3, topics: [{}] }])(
    '모양이 다르면 null: %j',
    (data) => {
      expect(vocEvidence(data)).toBeNull();
    },
  );
});
