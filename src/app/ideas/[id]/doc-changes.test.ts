import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Doc, type DocChange, type DocKey } from '@/lib/storage';

import { changeBadge, changeSentence, freshInputs, madeWithLine, upstreamHint } from './doc-changes';
import { formatKst } from './format-kst';
import { summaryLine } from './diff-view';

const doc = (key: DocKey, over: Partial<Doc> = {}): Doc => ({
  ...DOC_STEPS.find((s) => s.key === key)!,
  content: '내용',
  stale: false,
  changes: [],
  draft: null,
  versions: [],
  ...over,
});

describe('changeSentence', () => {
  it('원인마다 문장, 앞 문서와 함께 본 문서를 나눈다', () => {
    const prd = doc('prd');
    const out = (['evidence', 'decisions', 'idea', 'unknown', 'doc:roadmap', 'doc:plan'] as DocChange[]).map((c) => changeSentence(prd, c));
    expect(out).toEqual([
      '확인한 근거가 추가되거나 바뀌었어요',
      '결정이 바뀌었어요',
      '아이디어나 맥락이 바뀌었어요',
      '만든 뒤 입력이 바뀌었어요',
      '앞 문서(개발 로드맵)가 바뀌었어요',
      '함께 보는 기획안 문서가 바뀌었어요',
    ]);
    expect(changeBadge('evidence')).toBe('근거 바뀜');
    expect([changeBadge('doc:roadmap', prd), changeBadge('doc:plan', prd)]).toEqual(['앞 문서 바뀜', '함께 보는 문서 바뀜']);
  });
});

describe('upstreamHint', () => {
  it('앞 문서가 예전 기준이고 이 문서는 최신이면 앞 문서부터', () => {
    const docs = [doc('plan', { stale: true, changes: ['evidence'] }), doc('roadmap')];
    expect(upstreamHint(docs[1], docs)).toBe('기획안이 예전 기준이에요. 기획안부터 검토하세요.');
    expect(upstreamHint(docs[0], docs)).toBeNull();
    const prd = [doc('roadmap'), doc('prd', { stale: true, changes: ['unknown'] }), doc('spec')];
    expect(upstreamHint(prd[2], prd)).toBe('PRD가 예전 기준이에요. PRD부터 검토하세요.');
  });
});

describe('formatKst · summaryLine', () => {
  it('한국 시각, 잘못된 값은 빈 글', () => {
    expect(formatKst('2026-11-03T08:19:17Z')).toBe('2026.11.3 17:19');
    expect(formatKst('')).toBe('');
  });
  it('바뀐 절 요약', () => {
    expect(summaryLine({ added: 1, removed: 0, changed: ['목표'], addedSections: [], removedSections: [] })).toBe('바뀐 절: 목표 · 더한 줄 1, 뺀 줄 0');
    expect(summaryLine({ added: 0, removed: 0, changed: [], addedSections: [], removedSections: [] })).toBe('내용이 같아요.');
  });
});

describe('madeWithLine', () => {
  it('빠진 것 · 대신 쓴 것', () => {
    expect(madeWithLine({ madeWithout: ['roadmap'], madeFrom: 'plan' })).toBe('개발 로드맵 없이 기획안으로 만들었어요.');
    expect(madeWithLine({ madeWithout: ['plan'], madeFrom: 'idea' })).toBe('기획안 없이 아이디어로 만들었어요.');
    expect(madeWithLine({ madeWithout: ['plan'] })).toBe('기획안 없이 만들었어요.');
    expect(madeWithLine({})).toBeNull();
    expect(changeSentence({ from: 'prd', madeWithout: ['prd'] }, 'doc:prd')).toBe('빠졌던 PRD가 생겼어요');
  });
});

describe('freshInputs', () => {
  const dec = (q: string, at: string, status: 'decided' | 'deferred' | 'proposed' = 'decided') => ({ id: 'a', question: q, status, answer: status === 'decided' ? '성수' : '', reason: '', from: 'manual' as const, decidedAt: at });
  const ev = (t: string, at: string) => ({ id: 'b', text: t, source: 'interview' as const, sourceNote: '', question: '', collectedAt: at });
  it('바뀐 조각만, 지금 판 뒤에 적은 것만, 제안은 빼고', () => {
    const doc = { changes: ['decisions', 'evidence'] as DocChange[], generatedAt: '2026-11-03T01:00:00Z' };
    const r = freshInputs(doc, [dec('지역', '2026-11-03T02:00:00Z'), dec('옛', '2026-11-02T00:00:00Z'), dec('제안', '2026-11-03T03:00:00Z', 'proposed'), dec('미룸', '2026-11-03T03:00:00Z', 'deferred')], [ev('비싸요', '2026-11-03T02:00:00Z')]);
    expect(r).toEqual({ decisions: ['지역 → 성수', '미룸 → 보류'], evidence: ['비싸요'] });
    expect(freshInputs({ ...doc, changes: ['idea'] }, [dec('지역', '2026-11-03T02:00:00Z')], [ev('x', '2026-11-03T02:00:00Z')])).toEqual({ decisions: [], evidence: [] });
  });
  it('새 판 시각 뒤에 적은 것은 새 판에 없으니 뺀다 (시각 경계만)', () => {
    const doc = { changes: ['decisions'] as DocChange[], generatedAt: '2026-11-03T01:00:00Z', draft: { content: '', generatedAt: '2026-11-03T02:00:00Z', changes: [] as DocChange[] } };
    expect(freshInputs(doc, [dec('지역', '2026-11-03T01:30:00Z'), dec('나중', '2026-11-03T03:00:00Z')], []).decisions).toEqual(['지역 → 성수']);
  });
  it('새 판 경고 문장은 지금 판의 "빠졌던 문서" 표시를 쓰지 않는다', () => {
    expect(changeSentence({ from: 'plan' }, 'doc:plan')).toBe('앞 문서(기획안)가 바뀌었어요');
  });
  it('시각을 모르면 지금 들어가는 것 전부', () => {
    expect(freshInputs({ changes: ['decisions'] }, [dec('지역', '2026-01-01T00:00:00Z')], []).decisions).toEqual(['지역 → 성수']);
  });
});
