import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getQuestions, saveQuestions, type QuestionItem } from '.';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const items: QuestionItem[] = [
  { label: '목표 수치', kind: 'owner', role: '데이터', question: '예약 전환율 목표는 몇 %인가요?' },
  { label: '사용자 조사', kind: 'customer', role: '', question: '퇴근 후 클래스를 어떻게 찾나요?' },
];

describe('확인 질문', () => {
  it('없으면 null, 저장하면 다시 읽힌다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(await getQuestions(idea.id)).toBeNull();
    const saved = await saveQuestions(idea.id, { labels: ['목표 수치', '사용자 조사'], items });
    expect(saved.items).toEqual(items);
    expect(await getQuestions(idea.id)).toEqual(saved);
  });
  it('다시 저장하면 이전 판은 .history에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveQuestions(idea.id, { labels: ['목표 수치'], items: [items[0]] });
    await saveQuestions(idea.id, { labels: ['목표 수치', '사용자 조사'], items });
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('questions-'))).toBe(true);
    expect((await getQuestions(idea.id))?.items).toHaveLength(2);
  });
  it('깨진 항목은 건너뛰고, 깨진 파일은 null', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'questions.md');
    await fs.writeFile(
      file,
      [
        '---',
        'version: 1',
        "createdAt: '2026-10-29T00:00:00.000Z'",
        'labels:',
        '  - 지역',
        'items:',
        '  - { label: 지역, kind: owner, role: 기획, question: 첫 출시 지역은 어디인가요? }',
        '  - { label: 지역, kind: owner, role: 영업, question: 깨짐 }',
        '  - { label: 지역, kind: customer, role: 개발, question: 깨짐 }',
        "  - { label: 지역, kind: customer, role: '', question: ' ' }",
        '---',
        '',
      ].join('\n'),
    );
    expect((await getQuestions(idea.id))?.items.map((q) => q.question)).toEqual(['첫 출시 지역은 어디인가요?']);
    await fs.writeFile(file, '---\nlabels: [\n---\n');
    expect(await getQuestions(idea.id)).toBeNull();
  });
  it('없는 아이디어면 거부', async () => {
    await expect(saveQuestions('20261029-0900-zzzz', { labels: [], items: [] })).rejects.toThrow(
      '아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.',
    );
  });
});
