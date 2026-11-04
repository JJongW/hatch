import { describe, expect, it } from 'vitest';

import { MAX_SHORT, QUESTIONS } from './questions';
import { parseResponse } from './schema';

const valid = () => ({
  role: '마케터',
  aiUse: '가끔 써요',
  pains: ['AI가 근거 없는 숫자를 그럴듯하게 채워 넣었다'],
  worst: '  지난달 PRD에 가격을 AI가 정해 넣었어요  ',
  whatIs: '아이디어를 기획 문서로 이어 주는 도구',
  want: 4,
  wantWhy: '모르는 걸 표시해 줘서',
});

describe('parseResponse', () => {
  it('참가자 번호는 묻지 않는다', () => {
    expect(QUESTIONS.map((q) => q.id)).not.toContain('participant');
  });

  it('정상 응답: 글은 앞뒤 공백을 지우고, 선택 문항이 비면 뺀다', () => {
    const r = parseResponse(valid());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.answers.worst).toBe('지난달 PRD에 가격을 AI가 정해 넣었어요');
    const blank = parseResponse({ ...valid(), worst: '   ' });
    expect(blank.ok && blank.answers).not.toHaveProperty('worst');
  });

  it('필수 문항이 빠지면 그 문항 id로 오류', () => {
    const input: Record<string, unknown> = { ...valid(), whatIs: ' ', pains: [] };
    delete input.wantWhy;
    const r = parseResponse(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['pains', 'wantWhy', 'whatIs']);
  });

  it('선택지 밖 값, 중복 선택, 범위 밖 점수, 너무 긴 글을 막는다', () => {
    const pain = valid().pains[0];
    const r = parseResponse({ ...valid(), role: 'CEO', pains: [pain, pain], want: 6, wantWhy: 'a'.repeat(MAX_SHORT + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['pains', 'role', 'want', 'wantWhy']);
  });

  it('모르는 칸(예전 participant 포함)은 버리고, 객체가 아니면 실패', () => {
    const r = parseResponse({ ...valid(), hacker: 'x', participant: 'P1' });
    expect(r.ok && r.answers).not.toHaveProperty('hacker');
    expect(r.ok && r.answers).not.toHaveProperty('participant');
    expect(parseResponse('nope').ok).toBe(false);
    expect(parseResponse(null).ok).toBe(false);
  });
});
