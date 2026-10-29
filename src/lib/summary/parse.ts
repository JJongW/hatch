import { TBD } from '../tbd';

export const UNNAMED = '이름 없음';
// 프롬프트 문서가 "`[확인 필요: ○○]`로 표시된 정책은…"처럼 형식을 설명할 때 쓰는 자리
const PLACEHOLDER = '○○';
const TAIL = /\s*\[확인 필요[^\]]*\]\s*$/;

/** `## 제목` 줄부터 다음 `## ` 줄 전까지 (제목은 앞뒤 공백 무시하고 정확히 일치) */
export function section(md: string, title: string): string | null {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^##\s/.test(l) && l.slice(2).trim() === title);
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

export function firstParagraph(text: string): string {
  return text.trim().split(/\n\s*\n/)[0]?.trim() ?? '';
}

/** 비교용 공백 정리 (결정 질문 매칭 · 확인 질문 답함 계산) */
export const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** `TBD` 그룹 1 → 라벨. 형식 설명 자리(○○)면 null, 라벨이 없으면 UNNAMED (요약 판 · 확인 질문이 같이 쓴다) */
export function unknownLabel(raw: string): string | null {
  const label = norm(raw.replace(/^\s*:/, '')) || UNNAMED;
  return label === PLACEHOLDER ? null : label;
}

/** 모든 `[확인 필요: X]`를 X로 묶어 센다. 많은 순, 같으면 처음 나온 순 (Map 삽입 순 + 안정 정렬) */
export function countUnknowns(texts: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const m of text.matchAll(TBD)) {
      const label = unknownLabel(m[1]);
      if (label !== null) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** 기획안 `## 확인 필요` 절의 `- ` 항목 (끝 꼬리표 뗌). 답한 질문은 summary가 뺀다 */
export function planDecisions(plan: string): string[] {
  const body = section(plan, '확인 필요');
  if (!body) return [];
  return body
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).replace(TAIL, '').trim())
    .filter(Boolean);
}
