import { describe, expect, it } from 'vitest';

import { INPUT_HEADING } from '@/lib/prompts/context';

import { buildPrompt } from './build-prompt';

describe('buildPrompt', () => {
  it('빠진 문서가 없으면 안내를 넣지 않는다', () => {
    expect(buildPrompt('지시', [{ label: '기획안', body: '본문' }])).not.toContain('문서 없이 만든다');
  });
  it('빠진 문서가 있으면 입력 앞에 안내 한 줄', () => {
    const p = buildPrompt('지시', [{ label: '기획안', body: '본문' }], ['개발 로드맵']);
    expect(p).toContain('참고: 개발 로드맵 문서 없이 만든다.');
    expect(p.indexOf('참고:')).toBeLessThan(p.indexOf(INPUT_HEADING));
  });
});
