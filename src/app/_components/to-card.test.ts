import { describe, expect, it } from 'vitest';

import { EMPTY_CONTEXT, type Idea } from '@/lib/storage/types';

import { toCard } from './to-card';

const idea = { id: '20261103-0000-abcd', title: 't', memo: 'm', createdAt: '2026-11-03T00:00:00Z', folder: '', context: EMPTY_CONTEXT } as Idea;

describe('toCard facts', () => {
  it('있는 것만 배지로, 0은 만들지 않는다', () => {
    expect(toCard({ idea, progress: '기획안', done: 1, total: 7 }).facts).toEqual([]);
    expect(toCard({ idea, progress: '기획안', done: 1, total: 7, evidence: 2, decided: 0, prdReviewed: true }).facts).toEqual(['근거 2', 'PRD 리뷰함']);
  });
});
