import { describe, expect, it } from 'vitest';

import { DOC_STEPS, type Doc, type DocChange } from '@/lib/storage/types';

import { stepOf, thenLabel } from './next-step';

const label = (k: string) => DOC_STEPS.find((d) => d.key === k)?.label ?? k;
const doc = (over: Partial<Doc>): Doc => ({ ...DOC_STEPS[0], content: '본문', stale: true, changes: [], draft: null, versions: [], ...over });

describe('stepOf', () => {
  it('근거 때문에 바뀐 문서는 버튼이 "근거를 보고 … 검토하기"', () => {
    const d = doc({ changes: ['evidence'] as DocChange[] });
    expect(stepOf({ kind: 'check-stale', doc: 'plan' }, label, () => d)).toEqual({
      text: '기획안: 확인한 근거가 추가되거나 바뀌었어요. 검토해 보세요.',
      open: { doc: 'plan', label: '근거를 보고 기획안 검토하기' },
    });
  });
  it('결정 때문이면 평범한 검토, 새 판이 있으면 비교가 먼저', () => {
    expect(stepOf({ kind: 'check-stale', doc: 'plan' }, label, () => doc({ changes: ['decisions'] })).open?.label).toBe('기획안 검토하기');
    expect(stepOf({ kind: 'check-stale', doc: 'plan' }, label, () => doc({ draft: { content: 'x', generatedAt: '', changes: [] } })).open?.label).toBe('새 판 비교하기');
  });
  it('체험 과제: 맥락 적기는 맥락 폼, 결정 남기기는 확인 질문', () => {
    expect(stepOf({ kind: 'write-context' }, label, () => undefined).context).toBe('맥락 적기');
    expect(stepOf({ kind: 'decide' }, label, () => undefined).questions).toBe('확인 질문 열기');
  });
});

describe('thenLabel', () => {
  it('짧은 이름, 다 됨은 null', () => {
    expect(thenLabel({ kind: 'make-doc', doc: 'roadmap' }, label)).toBe('개발 로드맵 만들기');
    expect(thenLabel({ kind: 'decide' }, label)).toBe('결정 남기기');
    expect(thenLabel({ kind: 'done' }, label)).toBeNull();
  });
});
