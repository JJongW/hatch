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

/** 문서 전체에서 표시를 찾는다 (summary의 countUnknowns와 같은 범위 — 줄이 바뀐 표시도 한 번). groups는 많은 순 전부(자르지 않음), 라벨 없는 표시는 unnamed 수만 */
export function collectUnknowns(docs: { label: string; content: string | null }[]): Collected {
  const groups = new Map<string, UnknownGroup>();
  let unnamed = 0;
  for (const doc of docs) {
    if (doc.content === null) continue;
    const content = doc.content;
    for (const m of content.matchAll(TBD)) {
      const label = unknownLabel(m[1]);
      if (label === null) continue;
      if (label === UNNAMED) {
        unnamed++;
        continue;
      }
      const g = groups.get(label) ?? { label, count: 0, examples: [] };
      g.count++;
      // 예시는 표시가 시작한 줄 전체 (앞뒤 줄바꿈 사이)
      const start = content.lastIndexOf('\n', m.index) + 1;
      const end = content.indexOf('\n', m.index);
      const line = norm(content.slice(start, end < 0 ? undefined : end)).slice(0, LINE_MAX);
      if (g.examples.length < EXAMPLES && !g.examples.some((e) => e.line === line)) g.examples.push({ doc: doc.label, line });
      groups.set(label, g);
    }
  }
  return { groups: [...groups.values()].sort((a, b) => b.count - a.count), unnamed };
}
