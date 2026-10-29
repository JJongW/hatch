import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, listDecisions, removeDecision, saveDecision } from '.';

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const decided = { question: ' 첫 출시 지역은? ', status: 'decided' as const, answer: '성수동', reason: '공방이 많다', from: 'plan' as const };

describe('결정', () => {
  it('파일이 없으면 빈 목록, 저장하면 다듬어서 순서대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(await listDecisions(idea.id)).toEqual([]);
    const a = await saveDecision(idea.id, decided);
    const b = await saveDecision(idea.id, { question: '결제는?', status: 'deferred', answer: '무시됨', reason: '파트너 미정', from: 'manual' });
    expect(a).toMatchObject({ question: '첫 출시 지역은?', status: 'decided', answer: '성수동', from: 'plan' });
    expect(b.answer).toBe('');
    expect((await listDecisions(idea.id)).map((d) => d.id)).toEqual([a.id, b.id]);
  });
  it('입력 검사', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(saveDecision(idea.id, { ...decided, question: ' ' })).rejects.toThrow('정할 것을 적어 주세요.');
    await expect(saveDecision(idea.id, { ...decided, answer: '' })).rejects.toThrow('고른 답을 적어 주세요.');
    await expect(saveDecision(idea.id, { ...decided, reason: '' })).rejects.toThrow('이유를 적어 주세요.');
    await expect(saveDecision(idea.id, { ...decided, question: 'a'.repeat(201) })).rejects.toThrow('정할 것은 200자, 답과 이유는 500자까지예요.');
    await expect(saveDecision(idea.id, { ...decided, reason: 'a'.repeat(501) })).rejects.toThrow('정할 것은 200자, 답과 이유는 500자까지예요.');
    await expect(saveDecision(idea.id, { ...decided, status: 'x' as 'decided' })).rejects.toThrow('정함이나 보류 중 하나를 골라 주세요.');
  });
  it('수정하면 내용 · 시각이 바뀌고 출처 · id는 그대로, 이전 판은 .history에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveDecision(idea.id, decided);
    const b = await saveDecision(idea.id, { ...decided, answer: '망원동', from: 'manual' }, a.id);
    expect(b).toMatchObject({ id: a.id, answer: '망원동', from: 'plan' });
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('decisions-'))).toBe(true);
    await expect(saveDecision(idea.id, decided, 'zzzz')).rejects.toThrow('결정을 찾을 수 없어요. 새로고침해 주세요.');
  });
  it('지우면 목록에서 빠진다', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveDecision(idea.id, decided);
    await removeDecision(idea.id, a.id);
    expect(await listDecisions(idea.id)).toEqual([]);
  });
  it('깨진 항목은 건너뛰고, 깨진 파일은 빈 목록', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'decisions.md');
    await fs.writeFile(file, "---\nitems:\n  - id: ab12\n    question: 지역\n    status: decided\n    answer: 성수\n    reason: 많다\n    from: plan\n    decidedAt: '2026-10-29T00:00:00.000Z'\n  - id: 1\n    question: 깨짐\n---\n");
    expect((await listDecisions(idea.id)).map((d) => d.question)).toEqual(['지역']);
    await fs.writeFile(file, '---\nitems: [\n---\n');
    expect(await listDecisions(idea.id)).toEqual([]);
  });
  it("확인 질문에 답한 결정은 from 'question', 모르는 출처는 manual", async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveDecision(idea.id, { ...decided, from: 'question' });
    expect(a.from).toBe('question');
    expect((await listDecisions(idea.id))[0].from).toBe('question');
    const b = await saveDecision(idea.id, { ...decided, from: 'x' as 'manual' });
    expect(b.from).toBe('manual');
  });
});
