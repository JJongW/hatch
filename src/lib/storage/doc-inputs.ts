// 문서를 만들 때 실제로 쓸 입력 (순수 — 화면 · 생성 · 체험이 같이 쓴다). spec 2026-11-03 §4
// 권장 순서는 앞 문서부터지만 막지 않는다: 앞 문서가 없으면 가장 가까운 있는 앞 문서(없으면 아이디어)로 만든다
import { DOC_STEPS, type DocKey } from './types';

export type DocSource = DocKey | 'idea';
export type DocInputs = {
  /** 앞 문서 자리에 실제로 넣을 것 */
  from: DocSource;
  /** 함께 넣는 문서 (있는 것만, from과 겹치면 뺌) */
  extra: DocKey[];
  /** 권장 입력 중 없어서 빠진 문서 (앞 문서 · 함께 보는 문서) */
  missing: DocKey[];
};

const stepOf = (key: DocKey) => DOC_STEPS.find((s) => s.key === key)!;

export function docInputs(key: DocKey, has: (k: DocKey) => boolean): DocInputs {
  const step = stepOf(key);
  const missing: DocKey[] = [];
  let from: DocSource = step.from;
  while (from !== 'idea' && !has(from)) {
    missing.push(from);
    from = stepOf(from).from;
  }
  const wanted = step.extra ?? [];
  for (const k of wanted) if (!has(k) && !missing.includes(k)) missing.push(k);
  return { from, extra: wanted.filter((k) => has(k) && k !== from), missing };
}

/** 저장된 inputs 키 → 출처 ('idea' · 'decisions' · 'evidence'는 아이디어 쪽) */
export const sourceOfInput = (k: string): DocSource => (k.startsWith('doc:') ? (k.slice(4) as DocKey) : 'idea');
