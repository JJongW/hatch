import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createIdea, getDocs, getIdea, hashOf, ideaSource, listDecisions, listEvidence, saveDoc, saveEvidence } from '.';

const saveDocAndHash = async (id: string) => {
  const idea = (await getIdea(id))!;
  await saveDoc(id, 'plan', '# 기획안', { sourceHash: hashOf(ideaSource(idea, await listDecisions(id))) });
};

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
  process.env.HATCH_DATA_DIR = dir;
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
  delete process.env.HATCH_DATA_DIR;
});

const heard = { text: ' 퇴근길에 앱을 연다 ', source: 'interview' as const, sourceNote: ' 고객 A, 11/2 ', question: '언제 여나요?' };

describe('근거', () => {
  it('파일이 없으면 빈 목록, 저장하면 다듬어서 순서대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    expect(await listEvidence(idea.id)).toEqual([]);
    const a = await saveEvidence(idea.id, heard);
    const b = await saveEvidence(idea.id, { text: '결제 이탈 12%', source: 'teammate', sourceNote: '', question: '' });
    expect(a).toMatchObject({ text: '퇴근길에 앱을 연다', source: 'interview', sourceNote: '고객 A, 11/2', question: '언제 여나요?' });
    expect((await listEvidence(idea.id)).map((e) => e.id)).toEqual([a.id, b.id]);
  });
  it('입력 검사', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await expect(saveEvidence(idea.id, { ...heard, text: ' ' })).rejects.toThrow('들은 내용을 적어 주세요.');
    await expect(saveEvidence(idea.id, { ...heard, source: 'x' as 'voc' })).rejects.toThrow('어디서 확인했는지 골라 주세요.');
    await expect(saveEvidence(idea.id, { ...heard, text: 'a'.repeat(1001) })).rejects.toThrow('내용은 1000자, 출처 메모는 200자까지예요.');
  });
  it('근거를 저장해도 결정 · 기획안 입력(예전 기준 표시)은 그대로', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    await saveDocAndHash(idea.id);
    await saveEvidence(idea.id, heard);
    expect(await listDecisions(idea.id)).toEqual([]);
    expect((await getDocs(idea.id)).find((d) => d.key === 'plan')?.stale).toBe(false);
  });
  it('고치면 내용이 바뀌고 id · 질문은 그대로, 이전 판은 .history에', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const a = await saveEvidence(idea.id, heard);
    const b = await saveEvidence(idea.id, { ...heard, text: '출근길', question: '다른 질문' }, a.id);
    expect(b).toMatchObject({ id: a.id, text: '출근길', question: '언제 여나요?' });
    const hist = await fs.readdir(path.join(dir, 'ideas', idea.id, '.history'));
    expect(hist.some((f) => f.startsWith('evidence-'))).toBe(true);
    await expect(saveEvidence(idea.id, heard, 'zzzz')).rejects.toThrow('근거를 찾을 수 없어요. 새로고침해 주세요.');
  });
  it('깨진 항목은 건너뛰고, 깨진 파일은 빈 목록', async () => {
    const idea = await createIdea({ title: 'x', memo: '' });
    const file = path.join(dir, 'ideas', idea.id, 'evidence.md');
    await fs.writeFile(file, "---\nitems:\n  - id: ab12\n    text: 연다\n    source: voc\n    collectedAt: '2026-11-03T00:00:00.000Z'\n  - id: cd34\n    text: 깨짐\n    source: 몰라\n---\n");
    expect((await listEvidence(idea.id)).map((e) => [e.text, e.sourceNote, e.question])).toEqual([['연다', '', '']]);
    await fs.writeFile(file, '---\nitems: [\n---\n');
    expect(await listEvidence(idea.id)).toEqual([]);
  });
  it('없는 아이디어면 거부', async () => {
    await expect(saveEvidence('20260101-0000-abcd', heard)).rejects.toThrow('아이디어를 찾을 수 없어요');
  });
});
