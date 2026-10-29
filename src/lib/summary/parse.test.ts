import { describe, expect, it } from 'vitest';

import { countUnknowns, firstParagraph, planDecisions, section, UNNAMED } from './parse';

const PLAN = `# 제목

## 문제
첫 문단 한 줄.
이어지는 줄.

둘째 문단.

## 문제점 비교
다른 절

## 확인 필요
- 수요가 있는가? [확인 필요: 사용자 조사]
- 첫 출시 지역을 어디로 할 것인가?
  들여쓴 줄은 항목이 아니다

## 메모
끝`;

describe('section', () => {
  it('정확히 같은 제목 줄부터 다음 ## 전까지', () => {
    expect(section(PLAN, '문제')).toBe('첫 문단 한 줄.\n이어지는 줄.\n\n둘째 문단.');
  });
  it('제목 앞뒤 공백은 무시', () => {
    expect(section('##  문제  \n본문', '문제')).toBe('본문');
  });
  it('없으면 null', () => {
    expect(section(PLAN, '위험')).toBeNull();
  });
});

describe('firstParagraph', () => {
  it('빈 줄 앞까지', () => {
    expect(firstParagraph('\n\n가\n나\n\n다')).toBe('가\n나');
  });
  it('빈 글이면 빈 문자열', () => {
    expect(firstParagraph('  \n ')).toBe('');
  });
});

describe('countUnknowns', () => {
  it('라벨(공백 정리)로 묶고 많은 순, 같으면 처음 나온 순', () => {
    const texts = ['[확인 필요: 지역] [확인 필요:  결제   방식 ]', '[확인 필요: 결제 방식] [확인 필요: 동의]'];
    expect(countUnknowns(texts)).toEqual([
      { label: '결제 방식', count: 2 },
      { label: '지역', count: 1 },
      { label: '동의', count: 1 },
    ]);
  });
  it('라벨 없는 자리는 "이름 없음"으로 묶는다', () => {
    expect(countUnknowns(['[확인 필요] 그리고 [확인 필요]'])).toEqual([{ label: UNNAMED, count: 2 }]);
  });
  it('형식 설명용 ○○ 자리와 닫히지 않은 자리는 세지 않는다', () => {
    expect(countUnknowns(['`[확인 필요: ○○]`로 표시', '[확인 필요: 끝없음'])).toEqual([]);
  });
});

describe('planDecisions', () => {
  it('## 확인 필요 절의 "- " 항목, 끝 꼬리표는 뗀다', () => {
    expect(planDecisions(PLAN)).toEqual(['수요가 있는가?', '첫 출시 지역을 어디로 할 것인가?']);
  });
  it('절이 없으면 빈 배열', () => {
    expect(planDecisions('## 문제\n가')).toEqual([]);
  });
});
