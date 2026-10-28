import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { prdStep } from './prd';

const ok = {
  background: '첫 예약까지 걸리는 시간을 줄여야 한다',
  goals: ['추천에서 예약까지 한 번에'],
  nonGoals: ['결제 수수료 정산'],
  userStories: [{ as: '직장인', want: '근처 클래스를 보고 싶다', soThat: '퇴근 후 바로 갈 수 있다' }],
  requirements: [
    { content: '위치 기반 추천 목록을 보여준다', priority: 'P0' as const },
    { content: '찜 목록을 저장한다', priority: 'P2' as const },
  ],
  metrics: ['예약 전환율 — [확인 필요: 목표치]'],
  releaseScope: '추천과 예약까지 포함한다',
  openQuestions: ['환불 정책'],
};

describe('prdStep', () => {
  it('정상 예시는 통과', () => {
    expect(prdStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    expect(prdStep.schema.safeParse({ ...ok, background: undefined }).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(prdStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['background']) });
  });
  it('plan을 extra로 함께 받는다', () => {
    expect(prdStep.extra).toEqual(['plan']);
  });
  it('render는 제목 칸을 모두 담고 요구사항 번호를 준 순서대로 붙인다', () => {
    const md = prdStep.render(ok);
    for (const h of ['## 배경', '## 목표', '## 비목표', '## 사용자 스토리', '## 요구사항', '## 지표', '## 출시 범위', '## 확인 필요']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('- **직장인**로서 근처 클래스를 보고 싶다 — 퇴근 후 바로 갈 수 있다');
    expect(md).toContain('- **R1** `P0` 위치 기반 추천 목록을 보여준다');
    expect(md).toContain('- **R2** `P2` 찜 목록을 저장한다');
    expect(md.indexOf('R1')).toBeLessThan(md.indexOf('R2'));
  });
});
