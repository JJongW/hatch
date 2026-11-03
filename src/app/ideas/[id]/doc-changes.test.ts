import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Doc, type DocChange, type DocKey } from '@/lib/storage';

import { changeBadge, changeSentence, upstreamHint } from './doc-changes';
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
