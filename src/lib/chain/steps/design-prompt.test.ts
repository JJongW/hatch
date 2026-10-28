import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { designPromptStep } from './design-prompt';

const ok = {
  prompt: '1) 홈: 클래스 목록을 보여준다',
  screens: ['홈'],
  tone: '따뜻하고 가벼운 톤',
  references: ['카드 리스트'],
};

describe('designPromptStep', () => {
  it('정상 예시는 통과', () => {
    expect(designPromptStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    expect(designPromptStep.schema.safeParse({ ...ok, tone: undefined }).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(designPromptStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['prompt']) });
  });
  it('render는 제목 칸을 모두 담고 프롬프트를 ~~~text 펜스로 감싼다', () => {
    const md = designPromptStep.render(ok);
    for (const h of ['## 프롬프트', '## 화면 목록', '## 톤', '## 참고 패턴']) expect(md).toContain(h);
    expect(md).toContain(`~~~text\n${ok.prompt}\n~~~`);
  });
  it('빈 참고 패턴은 - 없음', () => {
    expect(designPromptStep.render({ ...ok, references: [] })).toContain('## 참고 패턴\n- 없음');
  });
});
