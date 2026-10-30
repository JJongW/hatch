import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { dataStep, type DataOutput } from './data';

const ok: DataOutput = {
  entities: [
    {
      key: 'user',
      name: '사용자',
      description: '서비스를 쓰는 사람',
      fields: [
        { key: 'nickname', name: '닉네임', type: 'text', required: true, example: '슈퍼PO', screens: ['홈', '프로필'] },
        { key: 'joined_at', name: '가입일', type: 'date', required: false, example: '2026-10-29', screens: [] },
      ],
    },
    {
      key: 'post',
      name: '게시글',
      description: '사용자가 쓰는 글',
      fields: [{ key: 'title', name: '제목', type: 'text', required: true, example: '퇴근길 "도예" 후기', screens: ['홈'] }],
    },
    { key: 'tag', name: '태그', description: '글 분류', fields: [{ key: 'label', name: '이름', type: 'text', required: true, example: '도예', screens: [] }] },
  ],
  relations: [
    { from: 'user', to: 'post', kind: '1:N', label: '작성한다' },
    { from: 'post', to: 'tag', kind: 'N:M', label: '붙는다' },
    { from: 'user', to: 'user', kind: '1:1', label: '추천인' },
  ],
  openQuestions: ['탈퇴 후 글 보관 기간'],
};

const fails = (o: unknown) => dataStep.schema.safeParse(o).success === false;

describe('dataStep', () => {
  it('정상 예시는 통과', () => {
    expect(dataStep.schema.safeParse(ok).success).toBe(true);
  });
  it('JSON Schema로 바꿀 수 있다', () => {
    expect(z.toJSONSchema(dataStep.schema)).toMatchObject({ type: 'object', required: expect.arrayContaining(['entities']) });
  });
  it('관계가 없는 엔티티를 가리키면 실패', () => {
    expect(fails({ ...ok, relations: [{ from: 'user', to: 'comment', kind: '1:N', label: '단다' }] })).toBe(true);
  });
  it('엔티티 key 중복이면 실패', () => {
    expect(fails({ ...ok, entities: [ok.entities[0], ok.entities[0]], relations: [] })).toBe(true);
  });
  it('엔티티 안 필드 key 중복이면 실패', () => {
    const user = { ...ok.entities[0], fields: [ok.entities[0].fields[0], ok.entities[0].fields[0]] };
    expect(fails({ ...ok, entities: [user, ...ok.entities.slice(1)] })).toBe(true);
  });
  it('한국어 key는 실패', () => {
    expect(fails({ ...ok, entities: [{ ...ok.entities[0], key: '사용자' }, ...ok.entities.slice(1)], relations: [] })).toBe(true);
  });

  it('render는 구성도 · 엔티티 · 관계 · 확인 필요를 담는다', () => {
    const md = dataStep.render(ok);
    for (const h of ['## 구성도', '## 엔티티', '## 관계', '## 확인 필요']) expect(md).toContain(h);
    expect(md).toContain('```mermaid\nerDiagram\n');
    expect(md).toContain('  user["사용자"] {\n    text nickname "닉네임, 필수"\n    date joined_at "가입일"\n  }');
    expect(md).toContain('  user ||--o{ post : "작성한다"');
    expect(md).toContain('  post }o--o{ tag : "붙는다"');
    expect(md).toContain('  user ||--|| user : "추천인"');
    expect(md).toContain('### 사용자 (user)\n서비스를 쓰는 사람');
    expect(md).toContain('- **닉네임** (nickname, text, 필수): 예 "슈퍼PO", 화면 홈, 프로필');
    expect(md).toContain('- **가입일** (joined_at, date, 선택): 예 "2026-10-29", 화면 -');
    expect(md).toContain('- 사용자 1:N 게시글 — 작성한다');
    expect(md).toContain('- 탈퇴 후 글 보관 기간');
  });
  it('mermaid 안 문자열의 큰따옴표는 작은따옴표로', () => {
    expect(dataStep.render(ok)).toContain(`text title "제목, 필수"`);
    const md = dataStep.render({ ...ok, entities: [{ ...ok.entities[0], name: '사용자 "PO"' }, ...ok.entities.slice(1)] });
    expect(md).toContain(`user["사용자 'PO'"]`);
  });
  it('관계 · 확인 필요가 없으면 - 없음, 렌더에 가운데 점이 없다', () => {
    const md = dataStep.render({ ...ok, relations: [], openQuestions: [] });
    expect(md).toContain('## 관계\n- 없음');
    expect(md).toContain('## 확인 필요\n- 없음');
    expect(md).not.toContain('·');
  });
});
