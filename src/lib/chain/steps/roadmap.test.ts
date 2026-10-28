import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { roadmapStep } from './roadmap';

const ok = {
  overview: '추천 기능부터 출시하고 예약을 붙인다',
  milestones: [
    { name: '추천', goal: '추천이 먹히는지 증명', scope: ['취향 입력', '추천 목록'], doneWhen: ['추천 목록이 보인다'] },
    { name: '예약', goal: '예약 전환 증명', scope: ['예약'], doneWhen: ['예약이 완료된다'] },
  ],
  outOfScope: ['결제 — 수수료 미정'],
  openQuestions: [],
};

describe('roadmapStep', () => {
  it('정상 예시는 통과', () => {
    expect(roadmapStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    expect(roadmapStep.schema.safeParse({ ...ok, overview: undefined }).success).toBe(false);
    expect(roadmapStep.schema.safeParse({ ...ok, milestones: [ok.milestones[0]] }).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(roadmapStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['overview']) });
  });
  it('render는 제목 칸과 코드가 붙인 번호를 담은 md', () => {
    const md = roadmapStep.render(ok);
    for (const h of ['## 개요', '## 마일스톤', '## 이번에 하지 않는 것', '## 확인 필요']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('### 1. 추천 (MVP)');
    expect(md).toContain('### 2. 예약\n');
    expect(md).toContain('**목표** 추천이 먹히는지 증명');
    expect(md).toContain('**범위**\n- 취향 입력');
    expect(md).toContain('**완료 기준**\n- 예약이 완료된다');
    expect(md).toContain('## 확인 필요\n- 없음');
  });
});
