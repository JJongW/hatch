import { describe, expect, it } from 'vitest';

import { splitTbd } from './tbd';

describe('splitTbd', () => {
  it('확인 필요 자리가 없으면 한 덩어리', () => {
    expect(splitTbd('결제는 직접 처리하지 않는다.')).toEqual([{ text: '결제는 직접 처리하지 않는다.', tbd: false }]);
  });

  it('빈 줄도 한 덩어리 (줄 번호가 밀리지 않게)', () => {
    expect(splitTbd('')).toEqual([{ text: '', tbd: false }]);
  });

  it('한 줄에 여러 개를 앞뒤 글자와 나눈다', () => {
    expect(splitTbd('지역은 [확인 필요: 첫 출시 지역]이고 [확인 필요: 로그인 필요 여부]')).toEqual([
      { text: '지역은 ', tbd: false },
      { text: '[확인 필요: 첫 출시 지역]', tbd: true },
      { text: '이고 ', tbd: false },
      { text: '[확인 필요: 로그인 필요 여부]', tbd: true },
    ]);
  });

  it('줄 맨 앞 · 형식 설명용 [확인 필요: ○○]도 표시', () => {
    expect(splitTbd('[확인 필요: ○○]로 표시')).toEqual([
      { text: '[확인 필요: ○○]', tbd: true },
      { text: '로 표시', tbd: false },
    ]);
  });

  it('닫는 괄호가 없으면 표시하지 않는다', () => {
    expect(splitTbd('[확인 필요: 끝없음')).toEqual([{ text: '[확인 필요: 끝없음', tbd: false }]);
  });
});
