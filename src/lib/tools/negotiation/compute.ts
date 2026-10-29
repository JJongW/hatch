export const CRITERIA = ['공감', '근거', '대안 제시', '범위 지키기', '명확성'] as const;
export type Criterion = (typeof CRITERIA)[number];
export const MAX_TOTAL = 25; // 기준 5개 × 5점
export const MAX_ANSWER_CHARS = 2_000;

type Persona = { role: string; goal: string; pressure: string };
type Scores = Record<Criterion, { score: number; reason: string } | null>;

/** 라운드마다 칸이 다르다: 1라운드는 persona · request, 다음 라운드는 scores · feedback · reaction · request */
export type NegotiationOutput = {
  persona?: Persona;
  scores?: { criterion: Criterion; score: number; reason: string }[];
  feedback?: string;
  reaction?: string;
  request: string;
};
export type NegotiationInput = { answer: string };

/** 한 라운드 = 결과 파일 하나. answer는 직전 요청에 대한 내 답(1라운드는 null), request는 이번에 받은 새 요청 */
export type Turn = {
  round: number;
  answer: string | null;
  scores: Scores | null;
  total: number | null; // 25점 만점. 응답 없는 기준은 빼고 환산
  missing: number; // 응답 없는 기준 수
  feedback: string | null;
  reaction: string | null;
  request: string;
};
export type NegotiationResult = {
  persona: Persona | null;
  rounds: Turn[]; // 1라운드부터 이번 라운드까지, 마지막이 이번
  delta: number | null; // 이번 합계 − 직전 라운드 합계
  criteriaDelta: Record<Criterion, number | null> | null;
  average: number | null; // 점수가 있는 라운드 합계의 평균
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const sub = (now: number | null | undefined, before: number | null | undefined) =>
  now == null || before == null ? null : round1(now - before);
const text = (s: string | undefined) => s?.trim() || null;

export function computeNegotiation(out: NegotiationOutput, input: NegotiationInput, prev: NegotiationResult | null): NegotiationResult {
  const history = prev?.rounds ?? [];
  let scores: Scores | null = null;
  let total: number | null = null;
  let missing = 0;
  if (prev) {
    // 1라운드는 내 답이 없으니 점수도 없다 (AI가 냈어도 버린다)
    scores = Object.fromEntries(
      CRITERIA.map((c) => {
        const s = out.scores?.find((x) => x.criterion === c); // 같은 기준이 둘이면 첫 번째
        return [c, s ? { score: clamp(s.score, 1, 5), reason: s.reason } : null];
      }),
    ) as Scores;
    const present = CRITERIA.map((c) => scores![c]?.score ?? null);
    missing = present.filter((x) => x === null).length;
    const a = avg(present);
    total = a === null ? null : round1(a * CRITERIA.length);
  }
  const turn: Turn = {
    round: history.length + 1,
    answer: prev ? input.answer : null,
    scores,
    total,
    missing,
    feedback: prev ? text(out.feedback) : null,
    reaction: prev ? text(out.reaction) : null,
    request: out.request,
  };
  const rounds = [...history, turn];
  const last = history.at(-1);
  const a = avg(rounds.map((t) => t.total));
  return {
    persona: prev ? prev.persona : (out.persona ?? null),
    rounds,
    delta: sub(total, last?.total),
    criteriaDelta:
      scores && last?.scores
        ? (Object.fromEntries(CRITERIA.map((c) => [c, sub(scores![c]?.score, last.scores![c]?.score)])) as Record<Criterion, number | null>)
        : null,
    average: a === null ? null : round1(a),
  };
}

const signed = (d: number) => (d === 0 ? '±0' : d > 0 ? `+${d}` : String(d));
const quote = (s: string) => s.split('\n').map((l) => `> ${l}`).join('\n');
const totalText = (t: Turn) =>
  t.total === null ? '응답 없음' : `${t.total} / ${MAX_TOTAL}${t.missing ? ` (응답 없음 ${t.missing}개 빼고 환산)` : ''}`;

export function renderNegotiation(r: NegotiationResult) {
  const now = r.rounds.at(-1)!;
  const before = r.rounds.at(-2);
  const p = r.persona;
  const parts = [`## 상대\n` + (p ? `- 역할: ${p.role}\n- 목표: ${p.goal}\n- 압박: ${p.pressure}` : '- 응답 없음')];
  if (now.round > 1) {
    parts.push(
      `## ${now.round}라운드 내 답\n${quote(now.answer ?? '')}`,
      `## 상대 반응\n${now.reaction ?? '응답 없음'}`,
      `## 피드백\n${now.feedback ?? '응답 없음'}`,
      // 점수는 판단 대신이 아니라 참고 (피드백 8) — 반응 · 피드백 뒤에 둔다
      `## 참고 점수: ${totalText(now)}${r.delta !== null && before ? ` (이전 ${before.total} → ${signed(r.delta)})` : ''}\n` +
        `- 세션 평균 ${r.average === null ? '응답 없음' : `${r.average} / ${MAX_TOTAL}`}\n` +
        CRITERIA.map((c) => {
          const s = now.scores?.[c];
          const d = r.criteriaDelta?.[c];
          return s ? `- ${c} ${s.score} — ${s.reason}${d != null ? ` (이전 ${before?.scores?.[c]?.score} → ${signed(d)})` : ''}` : `- ${c} 응답 없음`;
        }).join('\n'),
    );
  }
  if (r.rounds.length > 1) {
    parts.push(
      `## 지난 대화\n` +
        r.rounds
          .slice(0, -1)
          .map(
            (t) =>
              `### ${t.round}라운드${t.round > 1 ? `: ${totalText(t)}` : ''}\n` +
              (t.answer ? `- 내 답: ${t.answer.replace(/\s*\n\s*/g, ' ')}\n- 상대 반응: ${t.reaction ?? '응답 없음'}\n` : '') +
              `- 상대 요청: ${t.request}`,
          )
          .join('\n\n'),
    );
  }
  // 요청이 맨 끝 — 결과 바로 아래 '내 답' 칸과 붙는다
  parts.push(`## ${now.round === 1 ? '상대 요청' : '다음 요청'}\n${now.request}`);
  return parts.join('\n\n');
}
