import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getQuestions, listUsage, saveDoc } from '@/lib/storage';

import { collectUnknowns } from './collect';
import { makeQuestions, questionsPrompt } from './make';
import { validateQuestions } from './validate';

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
  it('줄이 바뀐 표시도 한 번으로 세고, 예시는 표시가 시작한 줄', () => {
    const c = collectUnknowns([doc('PRD', '앞 [확인 필요: 목표\n수치] 뒤')]);
    expect(c.groups.map((g) => [g.label, g.count])).toEqual([['목표 수치', 1]]);
    expect(c.groups[0].examples).toEqual([{ doc: 'PRD', line: '앞 [확인 필요: 목표' }]);
  });
  it('예시 줄은 공백을 정리하고 200자에서 자른다', () => {
    const line = '  ' + '가'.repeat(250) + '   [확인 필요: 길이]';
    expect(collectUnknowns([doc('PRD', line)]).groups[0].examples[0].line).toBe('가'.repeat(200));
  });
});

describe('validateQuestions', () => {
  const labels = ['목표 수치', '사용자 조사'];
  const ok = {
    items: [
      { label: '사용자 조사', kind: 'customer', role: '개발', question: '  퇴근 후  클래스를 어떻게 찾나요? ' },
      { label: '목표 수치', kind: 'owner', role: '', question: '전환율 목표는 몇 %인가요?' },
    ],
  };
  it('입력 라벨 순서로, customer role은 비우고 owner 빈 role은 기획', () => {
    expect(validateQuestions(labels, ok)).toEqual([
      { label: '목표 수치', kind: 'owner', role: '기획', question: '전환율 목표는 몇 %인가요?' },
      { label: '사용자 조사', kind: 'customer', role: '', question: '퇴근 후 클래스를 어떻게 찾나요?' },
    ]);
  });
  it('모르는 라벨 · 중복은 버리고 처음 통과한 항목만', () => {
    const r = validateQuestions(labels, {
      items: [
        { label: '목표 수치', kind: 'boss', role: '', question: '버려짐' },
        ...ok.items,
        { label: '없는 라벨', kind: 'customer', role: '', question: '버려짐' },
        { label: '목표 수치', kind: 'owner', role: '데이터', question: '두 번째' },
      ],
    });
    expect(r?.map((q) => q.question)).toEqual(['전환율 목표는 몇 %인가요?', '퇴근 후 클래스를 어떻게 찾나요?']);
  });
  it('잘못된 kind/role · 빈 질문 · 200자 초과는 버려서 라벨이 빠지면 null', () => {
    const bad = (over: Record<string, unknown>) => validateQuestions(labels, { items: [ok.items[0], { ...ok.items[1], ...over }] });
    expect(bad({ kind: 'boss' })).toBeNull();
    expect(bad({ role: '영업' })).toBeNull();
    expect(bad({ question: '  ' })).toBeNull();
    expect(bad({ question: 'a'.repeat(201) })).toBeNull();
    expect(bad({ question: 'a'.repeat(200) })).not.toBeNull();
  });
  it('모양이 다르면 null', () => {
    expect(validateQuestions(labels, null)).toBeNull();
    expect(validateQuestions(labels, { items: 'x' })).toBeNull();
  });
});

describe('questionsPrompt', () => {
  it('아이디어 · 맥락 블록 · 라벨 목록(수 · 예시 줄)', () => {
    const p = questionsPrompt({ title: '동네 클래스', memo: '' }, '### 정한 것\n- 지역 → 성수 (이유: 많다)', [
      { label: '목표 수치', count: 2, examples: [{ doc: '기획안', line: '목표 [확인 필요: 목표 수치]' }] },
    ]);
    expect(p).toContain('### 아이디어\n# 동네 클래스');
    expect(p).toContain('### 정한 것\n- 지역 → 성수 (이유: 많다)');
    expect(p).toContain('### 확인 필요 목록\n- 목표 수치 (2곳)\n  - 기획안: 목표 [확인 필요: 목표 수치]');
  });
});

describe('makeQuestions', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
    process.env.HATCH_DATA_DIR = dir;
    process.env.HATCH_CLAUDE_BIN = path.join(here, '../claude/fake-claude.mjs');
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.HATCH_DATA_DIR;
    delete process.env.HATCH_CLAUDE_BIN;
    delete process.env.FAKE_CLAUDE;
  });
  const withPlan = async () => {
    const idea = await createIdea({ title: '동네 클래스', memo: '' });
    await saveDoc(idea.id, 'plan', '목표 [확인 필요: 목표 수치]\n조사 [확인 필요: 사용자 조사] [확인 필요: 목표 수치]', { sourceHash: 'x' });
    return idea;
  };

  it('라벨이 없으면 claude를 부르지 않는다', async () => {
    process.env.FAKE_CLAUDE = 'crash'; // 불렸다면 로그인 안내 오류가 난다
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(makeQuestions(idea.id)).rejects.toThrow('질문으로 만들 [확인 필요]가 없어요.');
  });
  it('가짜 claude로 만들어 저장하고, 다시 만들면 이전 판은 .history에', async () => {
    process.env.FAKE_CLAUDE = 'questions';
    const idea = await withPlan();
    const set = await makeQuestions(idea.id);
    expect(set.labels).toEqual(['목표 수치', '사용자 조사']);
    expect(set.items.map((q) => [q.label, q.kind, q.role])).toEqual([
      ['목표 수치', 'customer', ''],
      ['사용자 조사', 'owner', '개발'],
    ]);
    expect(await getQuestions(idea.id)).toEqual(set);
    await makeQuestions(idea.id);
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('questions-'))).toBe(true);
  });
  it('장부에 questions 꼬리표, 두 번째는 again: true', async () => {
    process.env.FAKE_CLAUDE = 'questions';
    const { id } = await withPlan();
    await makeQuestions(id);
    await makeQuestions(id);
    const { entries } = await listUsage();
    expect(entries.map((e) => [e.feature, e.key, e.ideaId, e.again])).toEqual([
      ['questions', 'questions', id, false],
      ['questions', 'questions', id, true],
    ]);
  });
  it('결과가 라벨을 빠뜨리면 실패하고 저장하지 않는다', async () => {
    process.env.FAKE_CLAUDE = 'metrics'; // 다른 도구 모양 → items 없음
    const idea = await withPlan();
    await expect(makeQuestions(idea.id)).rejects.toThrow('질문을 다 만들지 못했어요. 다시 눌러 주세요.');
    expect(await getQuestions(idea.id)).toBeNull();
  });
});
