import { describe, expect, it } from 'vitest';

import { DOC_STEPS, EMPTY_CONTEXT, type Decision, type Doc } from '@/lib/storage/types';

import { buildSharePayload, shareCounts } from './build';
import { sharePayloadSchema } from './payload';

const docs: Doc[] = DOC_STEPS.map((s) => ({ ...s, content: s.key === 'plan' ? '## 문제\n노쇼' : s.key === 'prd' ? '## 목표' : null, stale: false }));
const decisions: Decision[] = [
  { id: 'a1b2', question: '알림 채널', status: 'decided', answer: '슬랙', reason: '이미 씀', from: 'question', decidedAt: '2026-11-03T00:00:00Z' },
];

describe('공유 본문 만들기 (허용 목록)', () => {
  const payload = buildSharePayload({
    idea: { title: '회의실', memo: '메모', context: { ...EMPTY_CONTEXT, customer: '팀원', goal: '  ' } },
    docs,
    questions: {
      createdAt: '2026-11-03T00:00:00Z',
      labels: ['일정'],
      items: [
        { label: '빈도', kind: 'customer', role: '', question: '얼마나 자주?' },
        { label: 'API', kind: 'owner', role: '개발', question: 'API가 있나요?' },
      ],
    },
    decisions,
  });

  it('내용 있는 문서, 채운 맥락 칸만 라벨까지 풀어서', () => {
    expect(payload.docs).toEqual([
      { label: '기획안', content: '## 문제\n노쇼' },
      { label: 'PRD', content: '## 목표' },
    ]);
    expect(payload.context).toEqual([{ label: '목표 고객', value: '팀원' }]);
    expect(payload.questions.map((q) => q.group)).toEqual(['고객에게 물을 것', '개발 담당자에게 확인할 것']);
  });

  it('결정은 id · 출처 · 시각을 빼고, 질문은 라벨을 뺀다', () => {
    expect(payload.decisions).toEqual([{ question: '알림 채널', status: 'decided', answer: '슬랙', reason: '이미 씀' }]);
    expect(JSON.stringify(payload)).not.toMatch(/a1b2|decidedAt|"from"|"label":"빈도"|createdAt|labels/);
  });

  it('Vercel 검사(strict)를 그대로 통과하고, 개수를 센다', () => {
    expect(sharePayloadSchema.safeParse(payload).success).toBe(true);
    expect(shareCounts(payload)).toEqual({ docs: 2, questions: 2, decisions: 1 });
  });
});
