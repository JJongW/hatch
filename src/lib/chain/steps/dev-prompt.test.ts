import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { devPromptStep } from './dev-prompt';

const ok = {
  prompt: '할 일 앱을 만든다.\n1) 테스트를 먼저 쓴다',
  assumptions: ['Next.js + 로컬 JSON 저장 [확인 필요]'],
  steps: ['스키마 정의', '화면 구현'],
};

describe('devPromptStep', () => {
  it('정상 예시는 통과', () => {
    expect(devPromptStep.schema.safeParse(ok).success).toBe(true);
  });
  it('필수 칸이 빠지면 실패', () => {
    expect(devPromptStep.schema.safeParse({ ...ok, prompt: undefined }).success).toBe(false);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(devPromptStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['prompt']) });
  });
  it('render는 제목 · 코드가 붙인 번호를 담는다', () => {
    const md = devPromptStep.render(ok);
    for (const h of ['## 프롬프트', '## 기술 가정', '## 작업 순서']) expect(md).toContain(h);
    expect(md).toContain('1. 스키마 정의');
    expect(md).toContain('2. 화면 구현');
  });
  it('프롬프트는 ~~~text 펜스로 감싸고 ``` 가 있어도 유지', () => {
    const p = '예시\n```ts\nconst a = 1;\n```\n끝';
    const md = devPromptStep.render({ ...ok, prompt: p });
    expect(md).toContain(`## 프롬프트\n~~~text\n${p}\n~~~`);
  });
  it('본문에 ~~~ 가 있으면 펜스를 더 길게 해서 중간에 닫히지 않는다', () => {
    const p = '예시\n~~~\n안쪽\n~~~';
    expect(devPromptStep.render({ ...ok, prompt: p })).toContain(`~~~~text\n${p}\n~~~~`);
  });
  it('기술 가정이 없으면 "없음"', () => {
    expect(devPromptStep.schema.safeParse({ ...ok, assumptions: [] }).success).toBe(true);
    expect(devPromptStep.render({ ...ok, assumptions: [] })).toContain('## 기술 가정\n- 없음');
  });
});
