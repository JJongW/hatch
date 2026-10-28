import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { specStep } from './spec';

const ok = {
  screens: [
    {
      name: '추천 목록',
      purpose: '취향에 맞는 클래스를 고른다',
      elements: ['클래스 카드'],
      actions: ['카드를 누르면 상세로 이동'],
    },
  ],
  functions: [
    {
      name: '클래스 추천',
      input: '사용자 취향',
      process: '취향과 일치하는 클래스를 고른다',
      output: '추천 클래스 목록',
      exceptions: ['취향이 비어 있으면 인기 클래스를 보여준다'],
    },
    { name: '예약', input: '클래스 선택', process: '예약을 저장한다', output: '예약 완료', exceptions: [] },
  ],
  dataItems: [{ name: '클래스', description: '제목 · 가격 · 위치' }],
  openQuestions: ['환불 정책'],
};

describe('specStep', () => {
  it('정상 예시는 통과', () => {
    expect(specStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    expect(specStep.schema.safeParse({ ...ok, screens: undefined }).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(specStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['screens']) });
  });
  it('render는 제목 칸을 모두 담고 기능 번호를 코드가 붙인다', () => {
    const md = specStep.render(ok);
    for (const h of ['## 화면', '## 기능', '## 데이터 항목', '## 확인 필요', '**구성 요소**', '**동작**', '**예외**']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('### 추천 목록');
    expect(md).toContain('### F1. 클래스 추천');
    expect(md).toContain('### F2. 예약');
    expect(md).toContain('- **입력** 사용자 취향');
    expect(md).toContain('- **클래스** — 제목 · 가격 · 위치');
    expect(md).toContain('- 없음');
  });
});
