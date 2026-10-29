/** 한 줄을 일반 글자와 `[확인 필요: …]` 자리로 나눈다 — 프롬프트를 넘기기 전에 채울 곳을 표시하려고 */
export type Segment = { text: string; tbd: boolean };

const TBD = /\[확인 필요[^\]]*\]/g;

export function splitTbd(line: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of line.matchAll(TBD)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), tbd: false });
    out.push({ text: m[0], tbd: true });
    last = m.index + m[0].length;
  }
  if (last < line.length || out.length === 0) out.push({ text: line.slice(last), tbd: false });
  return out;
}
