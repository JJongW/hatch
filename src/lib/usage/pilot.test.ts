import { describe, expect, it } from 'vitest';

import { pilotRows } from './pilot';

describe('채팅 vs Hatch 파일럿 표', () => {
  it('파일럿 기록과 같은 합계를 보인다 (244초 · 89초)', () => {
    const rows = pilotRows();
    expect(rows[0]).toMatchObject({ chat: '244초', hatch: '89초 (확인 질문 19초 따로)' });
    expect(rows.find((r) => r.label === '근거 없이 단정한 수치')).toMatchObject({ chat: '217개', hatch: '0개' });
    expect(rows.at(-1)).toMatchObject({ chat: '0.78달러 (3번)', hatch: '0.43달러 (4번, 확인 질문 포함)' });
  });
});
