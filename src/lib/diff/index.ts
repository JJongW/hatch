// 두 판 비교 (줄 단위). 의존성 없이 LCS — 문서는 수백 줄이라 O(n·m)로 충분하다.
// 2,000줄 × 2,000줄을 넘는 문서가 생기면 Myers diff로 바꾼다 (갈아탈 신호)
export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string };

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = a[i..] 와 b[j..] 의 최장 공통 줄 수
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ kind: 'del', text: a[i++] });
    else out.push({ kind: 'add', text: b[j++] });
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] });
  while (j < m) out.push({ kind: 'add', text: b[j++] });
  return out;
}

const HEADING = /^#{1,3} +(.+)$/;

/** `## 제목` 절마다 본문 (제목 앞 머리 글은 '' 절) */
function sections(text: string): Map<string, string> {
  const map = new Map<string, string>();
  let name = '';
  let lines: string[] = [];
  const flush = () => map.set(name, [...(map.get(name) ? [map.get(name)!] : []), lines.join('\n').trim()].join('\n'));
  for (const line of text.split('\n')) {
    const h = HEADING.exec(line);
    if (h && line.startsWith('## ')) {
      flush();
      name = h[1].trim();
      lines = [];
    } else lines.push(line);
  }
  flush();
  return map;
}

export type DiffSummary = {
  /** 더한 · 뺀 줄 수 (빈 줄 제외) */
  added: number;
  removed: number;
  /** 내용이 바뀐 절 · 새로 생긴 절 · 없어진 절 (`##` 제목 기준, 지금 판 순서) */
  changed: string[];
  addedSections: string[];
  removedSections: string[];
};

export function diffSummary(before: string, after: string): DiffSummary {
  const lines = lineDiff(before, after).filter((l) => l.text.trim() !== '');
  const a = sections(before);
  const b = sections(after);
  const named = (m: Map<string, string>) => [...m.keys()].filter(Boolean);
  return {
    added: lines.filter((l) => l.kind === 'add').length,
    removed: lines.filter((l) => l.kind === 'del').length,
    changed: named(b).filter((k) => a.has(k) && a.get(k) !== b.get(k)),
    addedSections: named(b).filter((k) => !a.has(k)),
    removedSections: named(a).filter((k) => !b.has(k)),
  };
}
