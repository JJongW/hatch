import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { planStep } from './plan';

const ok = {
  summary: '동네 원데이 클래스 추천',
  problem: '퇴근 후 할 거리를 찾기 어렵다',
  targetUsers: ['직장인'],
  value: '가까운 곳에서 바로 예약',
  features: [{ name: '추천', description: '취향 기반 추천' }],
  successMetrics: ['예약 전환율 — [확인 필요: 목표치]'],
  risks: ['공급자 확보'],
  openQuestions: ['결제 수수료'],
};

describe('planStep', () => {
  it('정상 예시는 통과', () => {
    expect(planStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    expect(planStep.schema.safeParse({ ...ok, problem: undefined }).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(planStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['summary']) });
  });
  it('render는 제목 칸을 모두 담은 md', () => {
    const md = planStep.render(ok);
    for (const h of ['## 한 줄 요약', '## 문제', '## 대상 사용자', '## 핵심 가치', '## 주요 기능', '## 성공 지표', '## 위험', '## 확인 필요']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('- **추천** — 취향 기반 추천');
  });
});
