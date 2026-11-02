import { describe, expect, it } from 'vitest';

import { MAX_SHORT } from './questions';
import { parseResponse } from './schema';

const grid = (v: string) => Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), v]));
const valid = () => ({
  participant: 'P1',
  role: '디자인',
  years: '1년 미만',
  aiUse: '가끔',
  aiTools: ['Claude'],
  taskDone: grid('혼자 해냄'),
  taskEase: grid('4'),
  h1FindDecision: 4,
  h2QuestionCount: '적당하다',
  h3NoticedDecision: '바로 알았다',
  h4PrdStale: '그렇다',
  h5ReviewWait: '괜찮았다',
  easy: 5,
  trust: 3,
  reuse: 4,
  recommend: 8,
  confusing: '  맥락 칸이 어디 있는지 몰랐어요  ',
  whyHatch: '결정이 남아서',
  data: '그대로 둬도 돼요',
});

describe('parseResponse', () => {
  it('정상 응답: participant를 떼고, 글은 앞뒤 공백을 지우고, 빈 선택 문항은 뺀다', () => {
    const r = parseResponse({ ...valid(), wish: '   ', mostUseful: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.participant).toBe('P1');
    expect(r.answers).not.toHaveProperty('participant');
    expect(r.answers.confusing).toBe('맥락 칸이 어디 있는지 몰랐어요');
    expect(r.answers).not.toHaveProperty('wish');
    expect(r.answers).not.toHaveProperty('mostUseful');
    expect(r.answers.taskDone).toEqual(grid('혼자 해냄'));
  });

  it('필수 문항이 빠지면 그 문항 id로 오류', () => {
    const input: Record<string, unknown> = { ...valid(), confusing: ' ' };
    delete input.whyHatch;
    const r = parseResponse(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['confusing', 'whyHatch']);
  });

  it('그리드는 모든 행에 답해야 한다', () => {
    const taskDone = grid('못 함');
    delete taskDone['6'];
    const r = parseResponse({ ...valid(), taskDone });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty('taskDone');
  });

  it('선택지 밖 값, 중복 선택, 범위 밖 점수, 너무 긴 글을 막는다', () => {
    const r = parseResponse({ ...valid(), participant: 'P9', aiTools: ['Claude', 'Claude'], easy: 6, recommend: 2.5, whyHatch: 'a'.repeat(MAX_SHORT + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['aiTools', 'easy', 'participant', 'recommend', 'whyHatch']);
  });

  it('모르는 칸은 버리고, 객체가 아니면 실패', () => {
    const r = parseResponse({ ...valid(), hacker: 'x' });
    expect(r.ok && r.answers).not.toHaveProperty('hacker');
    expect(parseResponse('nope').ok).toBe(false);
    expect(parseResponse(null).ok).toBe(false);
  });
});
