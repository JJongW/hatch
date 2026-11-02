import type { Doc, DocKey } from '@/lib/storage';

export type DocStatus = 'running' | 'stale' | 'done' | 'next' | 'wait';

export type ChainProgress = {
  status: Record<DocKey, DocStatus>;
  /** 내용이 있는 문서 수 (앞 문서가 바뀐 것도 포함) */
  done: number;
  total: number;
  /** 체인 순서로 다음에 만들 문서. 생성 중이거나 만들 수 있는 빈 문서가 없으면 null */
  next: DocKey | null;
};

/** 문서 탭 진행 표시 (spec 2026-11-02 chain-progress §2). 위에서부터 먼저 맞는 상태 하나 */
export function chainProgress(docs: Doc[], running: DocKey | null): ChainProgress {
  const has = (key: DocKey | 'idea') => key === 'idea' || docs.some((d) => d.key === key && d.content !== null);
  const next =
    running === null ? (docs.find((d) => d.content === null && has(d.from))?.key ?? null) : null;
  const statusOf = (d: Doc): DocStatus =>
    d.key === running ? 'running' : d.content !== null ? (d.stale ? 'stale' : 'done') : d.key === next ? 'next' : 'wait';
  return {
    status: Object.fromEntries(docs.map((d) => [d.key, statusOf(d)])) as Record<DocKey, DocStatus>,
    // 목록 카드도 같은 규칙으로 센다 (storage listIdeasWithProgress). 세는 곳이 3곳이 되면 storage/progress.ts로 모은다
    done: docs.filter((d) => d.content !== null).length,
    total: docs.length,
    next,
  };
}

/** 탭 위 요약 한 줄 (spec chain-progress §3). 다시 만드는 중이면 완료 수는 그대로 두고 "지금 ○○ 만드는 중"을 붙인다 */
export function summaryLine({ done, total, next }: ChainProgress, docs: Doc[], running: DocKey | null): string {
  const label = (key: DocKey) => docs.find((d) => d.key === key)?.label ?? '';
  if (running) return `${total}개 중 ${done}개 완료, 지금 ${label(running)} 만드는 중`;
  // 체인 순서상 처음 빈 문서는 앞 문서가 늘 있으므로, 생성 중이 아니고 빈 문서가 있으면 next도 있다
  if (done === total || !next) return `${total}개 모두 완료`;
  return `${total}개 중 ${done}개 완료, 다음 차례는 ${label(next)}`;
}
