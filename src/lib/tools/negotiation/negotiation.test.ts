import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getToolResult } from '@/lib/storage';

import { runTool } from '../run';
import { computeNegotiation, CRITERIA, renderNegotiation, type NegotiationOutput } from './compute';
import { negotiationTool } from './index';

const here = path.dirname(fileURLToPath(import.meta.url));

const opening: NegotiationOutput = { persona: { role: '영업 본부장', goal: '계약 목표', pressure: '고객 이탈' }, request: '엑셀 내보내기를 넣어 주세요.' };
const scored = (ss: number[], extra: Partial<NegotiationOutput> = {}): NegotiationOutput => ({
  scores: ss.map((score, i) => ({ criterion: CRITERIA[i], score, reason: '이유' })),
  feedback: '대안을 낸다.',
  reaction: '알겠어요.',
  request: '다음 분기에 넣어 주세요.',
  ...extra,
});
const round1 = () => computeNegotiation(opening, { answer: '' }, null);

describe('negotiationTool 스키마', () => {
  it('출력: 1라운드 · 다음 라운드 모양 모두 통과, request 없음 · 모르는 기준 실패, JSON Schema 변환', () => {
    const s = negotiationTool.outputSchema;
    expect(s.safeParse(opening).success).toBe(true);
    expect(s.safeParse(scored([3, 3, 3, 3, 3])).success).toBe(true);
    expect(s.safeParse({ persona: opening.persona }).success).toBe(false);
    expect(s.safeParse({ ...scored([3]), scores: [{ criterion: '속도', score: 3, reason: 'x' }] }).success).toBe(false);
    expect(z.toJSONSchema(s)).toMatchObject({ type: 'object', required: ['request'] });
  });
  it('입력: 앞뒤 공백 제거 · 빈 칸 기본값 · 2,000자 넘으면 한국어 메시지', () => {
    const s = negotiationTool.inputSchema;
    expect(s.parse({ answer: '  답  ', mode: 'x' })).toEqual({ answer: '답' });
    expect(s.parse({})).toEqual({ answer: '' });
    const r = s.safeParse({ answer: '가'.repeat(2001) });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('입력이 너무 길어요 (최대 2,000자).');
    expect(s.safeParse({ answer: '가'.repeat(2000) }).success).toBe(true);
  });
});

describe('validate', () => {
  it('1라운드는 내 답이 없어야 하고, 다음 라운드는 내 답이 있어야 한다', () => {
    const v = negotiationTool.validate!;
    expect(v({ answer: '' }, null)).toBeUndefined();
    expect(v({ answer: '답' }, null)).toContain('1라운드는 내 답 없이');
    expect(v({ answer: '' }, round1())).toBe('내 답을 적어 주세요.');
    expect(v({ answer: '답' }, round1())).toBeUndefined();
  });
});

describe('computeNegotiation', () => {
  it('1라운드: 페르소나 · 요청만, 점수가 와도 버린다', () => {
    const r = computeNegotiation({ ...opening, scores: scored([5, 5, 5, 5, 5]).scores }, { answer: '' }, null);
    expect(r.persona?.role).toBe('영업 본부장');
    expect(r.rounds).toHaveLength(1);
    expect(r.rounds[0]).toMatchObject({ round: 1, answer: null, scores: null, total: null, request: opening.request });
    expect(r.delta).toBeNull();
    expect(r.average).toBeNull();
  });
  it('범위 밖 점수를 1~5로 자르고 합계(25점 만점)를 낸다, 첫 채점 라운드는 변화 없음', () => {
    const r = computeNegotiation(scored([9, 0, 3.4, 4, -2]), { answer: '내 답' }, round1());
    const t = r.rounds[1];
    expect(CRITERIA.map((c) => t.scores?.[c]?.score)).toEqual([5, 1, 3, 4, 1]);
    expect(t).toMatchObject({ round: 2, answer: '내 답', total: 14, missing: 0, feedback: '대안을 낸다.' });
    expect(r.persona?.role).toBe('영업 본부장'); // 1라운드 페르소나를 잇는다
    expect(r.delta).toBeNull();
    expect(r.criteriaDelta).toBeNull();
    expect(r.average).toBe(14);
  });
  it('빠진 기준은 응답 없음(null)이고 합계는 나머지로 환산, 점수가 아예 없으면 합계 없음', () => {
    const r = computeNegotiation(scored([4, 4, 3]), { answer: '답' }, round1());
    expect(r.rounds[1].scores?.['범위 지키기']).toBeNull();
    expect(r.rounds[1]).toMatchObject({ total: 18.3, missing: 2 }); // 11/3 × 5
    const none = computeNegotiation({ request: '요청' }, { answer: '답' }, round1());
    expect(none.rounds[1]).toMatchObject({ total: null, missing: 5, feedback: null, reaction: null });
    expect(none.average).toBeNull();
  });
  it('라운드 간 변화(합계 · 기준별)와 세션 평균, 직전에 없던 기준은 변화 없음', () => {
    const r2 = computeNegotiation(scored([2, 2, 2, 2]), { answer: '답1' }, round1()); // 10
    const r3 = computeNegotiation(scored([3, 4, 2, 5, 5]), { answer: '답2' }, r2); // 19
    expect(r3.rounds.map((t) => t.total)).toEqual([null, 10, 19]);
    expect(r3.delta).toBe(9);
    expect(r3.criteriaDelta).toEqual({ 공감: 1, 근거: 2, '대안 제시': 0, '범위 지키기': 3, 명확성: null });
    expect(r3.average).toBe(14.5);
    const r4 = computeNegotiation({ request: '요청' }, { answer: '답3' }, r3);
    expect(r4.delta).toBeNull();
    expect(r4.average).toBe(14.5); // 점수 없는 라운드는 평균에서 뺀다
  });
});

describe('renderNegotiation', () => {
  it('1라운드: 상대 → 상대 요청(맨 끝), 점수 칸 없음', () => {
    const md = renderNegotiation(round1());
    expect(md.indexOf('## 상대\n- 역할: 영업 본부장')).toBe(0);
    expect(md).toContain('## 상대 요청\n엑셀 내보내기를 넣어 주세요.');
    expect(md.trimEnd().endsWith("아래에 내 답을 적고 '내 답 보내기'를 눌러 주세요.")).toBe(true);
    expect(md).not.toContain('점수');
    expect(md).not.toContain('## 지난 대화');
  });
  it('다음 라운드: 내 답 → 상대 반응 → 피드백 → 참고 점수 → 지난 대화 → 다음 요청(맨 끝)', () => {
    const r2 = computeNegotiation(scored([2, 2, 2, 2, 2]), { answer: '첫 답' }, round1());
    const r3 = computeNegotiation(scored([3, 3, 3, 3]), { answer: '둘째\n답' }, r2);
    const md = renderNegotiation(r3);
    const order = [
      '## 상대',
      '## 3라운드 내 답\n> 둘째\n> 답',
      '## 상대 반응',
      '## 피드백',
      '## 참고 점수 · 15 / 25 (응답 없음 1개 빼고 환산) (이전 10 → +5)',
      '- 세션 평균 12.5 / 25',
      '- 공감 3 — 이유 (이전 2 → +1)',
      '- 명확성 응답 없음',
      '## 지난 대화',
      '### 1라운드\n- 상대 요청: 엑셀',
      '### 2라운드 · 10 / 25\n- 내 답: 첫 답',
      '## 다음 요청',
    ];
    let at = -1;
    for (const s of order) {
      const i = md.indexOf(s);
      expect(i, s).toBeGreaterThan(at);
      at = i;
    }
    expect(md).not.toContain('## 점수');
  });
});

describe('promptInput', () => {
  it('1라운드는 비고, 다음 라운드는 상대 · 지난 대화 · 이번 내 답을 넣는다', () => {
    expect(negotiationTool.promptInput({ answer: '' }, null)).toBe('');
    const s = negotiationTool.promptInput({ answer: '이번 답' }, round1());
    expect(s).toContain('역할: 영업 본부장');
    expect(s).toContain('[1라운드]\n상대 요청: 엑셀 내보내기를 넣어 주세요.');
    expect(s).toContain('### 이번 내 답 (2라운드)\n이번 답');
  });
});

describe('runTool + FAKE_CLAUDE=negotiation', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-test-'));
    process.env.HATCH_DATA_DIR = dir;
    process.env.HATCH_CLAUDE_BIN = path.join(here, '../../claude/fake-claude.mjs');
    process.env.FAKE_CLAUDE = 'negotiation';
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
    delete process.env.HATCH_DATA_DIR;
    delete process.env.HATCH_CLAUDE_BIN;
    delete process.env.FAKE_CLAUDE;
  });

  it('1라운드 → prevId로 2라운드, 라운드마다 새 파일 · 입력 검사', async () => {
    const source = { pasted: '## 범위\n엑셀 내보내기는 제외' };
    await expect(runTool(negotiationTool, { source, input: { answer: '미리 쓴 답' } })).rejects.toThrow('1라운드는 내 답 없이');

    const first = await runTool(negotiationTool, { source, input: { answer: '' } });
    const r1 = await getToolResult(null, first.resultId);
    expect(r1?.tool).toBe('negotiation');
    expect(r1?.body).toContain('## 상대 요청');

    await expect(runTool(negotiationTool, { source, input: { answer: ' ' }, prevId: first.resultId })).rejects.toThrow('내 답을 적어 주세요.');

    const second = await runTool(negotiationTool, { source, input: { answer: '이번 분기는 어렵고 다음 분기를 제안해요.' }, prevId: first.resultId });
    expect(second.resultId).not.toBe(first.resultId);
    const r2 = await getToolResult(null, second.resultId);
    expect(r2?.prevId).toBe(first.resultId);
    expect(r2?.body).toContain('## 참고 점수 · 15 / 25'); // fake 점수 1~5
    expect(r2?.body).toContain('## 지난 대화');
  });
});
