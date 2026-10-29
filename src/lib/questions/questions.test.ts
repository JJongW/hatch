import { describe, expect, it } from 'vitest';

import { collectUnknowns } from './collect';

const doc = (label: string, content: string | null) => ({ label, content });

describe('collectUnknowns', () => {
  it('라벨별 수 · 예시 줄 2개(같은 줄은 한 번) · 많은 순', () => {
    const c = collectUnknowns([
      doc('기획안', '목표는 [확인 필요: 목표 수치]다.\n지역 [확인 필요: 지역] 과 [확인 필요:지역]'),
      doc('PRD', '- 전환율 [확인 필요: 목표 수치]\n- 또 [확인 필요: 목표 수치]'),
      doc('개발 로드맵', null),
    ]);
    expect(c.groups.map((g) => [g.label, g.count])).toEqual([['목표 수치', 3], ['지역', 2]]);
    expect(c.groups[0].examples).toEqual([
      { doc: '기획안', line: '목표는 [확인 필요: 목표 수치]다.' },
      { doc: 'PRD', line: '- 전환율 [확인 필요: 목표 수치]' },
    ]);
    expect(c.groups[1].examples).toEqual([{ doc: '기획안', line: '지역 [확인 필요: 지역] 과 [확인 필요:지역]' }]);
    expect(c.unnamed).toBe(0);
  });
  it('라벨 없는 표시는 수만, 형식 설명(○○)은 제외', () => {
    expect(collectUnknowns([doc('기획안', '[확인 필요] 하나\n[확인 필요 ] 둘\n"[확인 필요: ○○]"로 남긴다')])).toEqual({ groups: [], unnamed: 2 });
  });
  it('예시 줄은 공백을 정리하고 200자에서 자른다', () => {
    const line = '  ' + '가'.repeat(250) + '   [확인 필요: 길이]';
    expect(collectUnknowns([doc('PRD', line)]).groups[0].examples[0].line).toBe('가'.repeat(200));
  });
});
