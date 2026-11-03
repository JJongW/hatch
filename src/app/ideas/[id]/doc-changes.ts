// 문서 바뀜 알림 문구 (순수). 실제로 바뀐 입력만 말한다 — 원인을 모르면 모른다고 (spec 2026-11-03 §2)
import { DOC_STEPS, type Doc, type DocChange } from '@/lib/storage/types';

const labelOf = (key: string) => DOC_STEPS.find((d) => d.key === key)?.label ?? key;

/** 받침이 있으면 '이', 없으면(영문 이름 포함) '가' — 기획안이 · PRD가 */
const iGa = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? '이' : '가';
};

/** 원인 하나 → 한 문장 */
export function changeSentence(doc: Pick<Doc, 'from'>, c: DocChange): string {
  if (c === 'evidence') return '확인한 근거가 추가되거나 바뀌었어요';
  if (c === 'decisions') return '결정이 바뀌었어요';
  if (c === 'idea') return '아이디어나 맥락이 바뀌었어요';
  if (c === 'unknown') return '만든 뒤 입력이 바뀌었어요';
  const key = c.slice(4);
  return key === doc.from ? `앞 문서(${labelOf(key)})가 바뀌었어요` : `함께 보는 ${labelOf(key)} 문서가 바뀌었어요`;
}

/** 배지 한 단어 (첫 원인). doc을 주면 함께 보는 문서(extra)와 앞 문서를 나눈다 */
export function changeBadge(c: DocChange, doc?: Pick<Doc, 'from'>): string {
  if (c === 'evidence') return '근거 바뀜';
  if (c === 'decisions') return '결정 바뀜';
  if (c === 'idea') return '맥락 바뀜';
  if (c === 'unknown') return '입력 바뀜';
  return doc && c.slice(4) !== doc.from ? '함께 보는 문서 바뀜' : '앞 문서 바뀜';
}

/** 이 문서는 최신인데 앞 문서가 예전 기준이면: 앞 문서부터 보라고 (배지 없이 한 줄) */
export function upstreamHint(doc: Doc, docs: Doc[]): string | null {
  if (doc.content === null || doc.stale || doc.from === 'idea') return null;
  const from = docs.find((d) => d.key === doc.from);
  return from?.content != null && from.stale ? `${from.label}${iGa(from.label)} 예전 기준이에요. ${from.label}부터 검토하세요.` : null;
}
