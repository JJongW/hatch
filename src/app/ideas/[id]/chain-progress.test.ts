import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Doc, type DocKey } from '@/lib/storage';

import { chainProgress, summaryLine } from './chain-progress';

const docsWith = (...keys: DocKey[]): Doc[] =>
  DOC_STEPS.map((s) => ({ ...s, content: keys.includes(s.key) ? '내용' : null, stale: false, changes: [], draft: null, versions: [] }));

const stale = (docs: Doc[], key: DocKey) => docs.map((d) => (d.key === key ? { ...d, stale: true } : d));

describe('chainProgress', () => {
  const status = (docs: Doc[], running: DocKey | null = null) => chainProgress(docs, running).status;

  it('빈 체인: 기획안이 다음 차례, 나머지는 대기', () => {
    const p = chainProgress(docsWith(), null);
    expect(p).toMatchObject({ done: 0, total: 7, next: 'plan' });
    expect(p.status.plan).toBe('next');
    expect(p.status.roadmap).toBe('wait');
  });

  it('중간까지 만들면 앞 문서가 있는 첫 빈 문서가 다음 차례', () => {
    expect(status(docsWith('plan', 'roadmap'))).toMatchObject({ plan: 'done', roadmap: 'done', prd: 'next', spec: 'wait' });
    expect(chainProgress(docsWith('plan', 'roadmap'), null).done).toBe(2);
  });

  it('앞 문서가 없으면 다음 차례가 될 수 없다 (디자인 프롬프트는 데이터 구성이 있어야)', () => {
    const p = chainProgress(docsWith('plan', 'roadmap', 'prd', 'spec', 'dev-prompt'), null);
    expect(p.next).toBe('data');
    expect(p.status['design-prompt']).toBe('wait');
  });

  it('앞 문서가 바뀐 문서는 생성된 수에 넣고 상태는 바뀜', () => {
    const p = chainProgress(stale(docsWith('plan', 'roadmap'), 'roadmap'), null);
    expect(p.status.roadmap).toBe('stale');
    expect(p.done).toBe(2);
  });

  it('생성 중이면 그 문서는 만드는 중, 다음 차례는 없다', () => {
    const p = chainProgress(docsWith('plan'), 'roadmap');
    expect(p.status.roadmap).toBe('running');
    expect(p.next).toBeNull();
    expect(Object.values(p.status)).not.toContain('next');
  });

  it('모두 있으면 다음 차례가 없다', () => {
    const all = DOC_STEPS.map((s) => s.key);
    const p = chainProgress(docsWith(...all), null);
    expect(p).toMatchObject({ done: 7, total: 7, next: null });
  });
});

describe('chainProgress 경계', () => {
  it('앞 문서가 바뀌었어도 내용이 있으면 다음 문서는 다음 차례가 된다', () => {
    expect(chainProgress(stale(docsWith('plan'), 'plan'), null).next).toBe('roadmap');
  });

  it('다시 만드는 중이면 내용이 있어도 만드는 중이 먼저', () => {
    expect(chainProgress(docsWith('plan', 'roadmap'), 'plan').status.plan).toBe('running');
  });
});

describe('summaryLine', () => {
  const line = (docs: Doc[], running: DocKey | null = null) => summaryLine(chainProgress(docs, running), docs, running);

  it('기본: 생성된 수와 다음 차례', () => {
    expect(line(docsWith('plan', 'roadmap'))).toBe('7개 중 2개 생성됨, 다음 차례는 PRD');
  });

  it('생성 중이면 지금 만드는 문서', () => {
    expect(line(docsWith('plan'), 'roadmap')).toBe('7개 중 1개 생성됨, 지금 개발 로드맵 만드는 중');
  });

  it('모두 있으면 모두 생성됨', () => {
    expect(line(docsWith(...DOC_STEPS.map((s) => s.key)))).toBe('7개 모두 생성됨');
  });

  it('중간이 비면 비어 있는 첫 문서가 다음 차례', () => {
    const docs = docsWith('plan', 'roadmap', 'prd', 'spec', 'data', 'dev-prompt', 'design-prompt').map((d) =>
      d.key === 'spec' ? { ...d, content: null } : d,
    );
    expect(line(docs)).toBe('7개 중 6개 생성됨, 다음 차례는 기능명세');
  });
});
