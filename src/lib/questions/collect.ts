// [확인 필요] 라벨 모으기 — 순수 계산 (화면 계산 · 만들기가 같이 쓴다)
import { norm, UNNAMED, unknownLabel } from '../summary/parse';
import { TBD } from '../tbd';

export type UnknownExample = { doc: string; line: string };
export type UnknownGroup = { label: string; count: number; examples: UnknownExample[] };
export type Collected = { groups: UnknownGroup[]; unnamed: number };

/** 질문으로 만드는 라벨 수. 넘는 라벨은 이번 목록에서 빠지고 수만 안내 (spec §2) */
export const QUESTION_LABEL_MAX = 30;
const EXAMPLES = 2;
const LINE_MAX = 200;

/** 줄 단위로 라벨을 묶는다. groups는 많은 순 전부(자르지 않음), 라벨 없는 표시는 unnamed 수만 */
export function collectUnknowns(docs: { label: string; content: string | null }[]): Collected {
  const groups = new Map<string, UnknownGroup>();
  let unnamed = 0;
  for (const doc of docs) {
    if (doc.content === null) continue;
    for (const raw of doc.content.split('\n')) {
      for (const m of raw.matchAll(TBD)) {
        const label = unknownLabel(m[1]);
        if (label === null) continue;
        if (label === UNNAMED) {
          unnamed++;
          continue;
        }
        const g = groups.get(label) ?? { label, count: 0, examples: [] };
        g.count++;
        const line = norm(raw).slice(0, LINE_MAX);
        if (g.examples.length < EXAMPLES && !g.examples.some((e) => e.line === line)) g.examples.push({ doc: doc.label, line });
        groups.set(label, g);
      }
    }
  }
  return { groups: [...groups.values()].sort((a, b) => b.count - a.count), unnamed };
}
