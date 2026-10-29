import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction } from '@/lib/summary';

/** 처음 여는 탭: 다음 행동이 가리키는 문서 → 내용 있는 마지막 문서 → 기획안 */
export function firstTab(docs: Doc[], next: NextAction): DocKey {
  if ('doc' in next) return next.doc;
  return docs.findLast((d) => d.content !== null)?.key ?? 'plan';
}
