import type { Doc } from './types';

/** 진행 배지: 파일이 있는 가장 뒤 단계 이름. 없으면 "아이디어". */
export function progressOf(docs: Doc[]) {
  const last = docs.findLast((d) => d.content !== null);
  return last ? last.label : '아이디어';
}
