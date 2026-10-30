// 사용량 장부를 화면용 숫자로 바꾼다. AI는 판단, 코드는 계산 — 합계, 평균, 신호는 여기서만
import type { UsageEntry, UsageFeature } from '@/lib/storage';

/** 신호 기준 (spec §4). 숫자를 바꾸려면 여기만 */
export const SIGNAL = { heavyShare: 0.3, redoMin: 2, redoShare: 0.5 } as const;

export type Signal = 'heavy' | 'loops' | 'redo' | 'fails';
export type FeatureRow = {
  feature: UsageFeature;
  key: string;
  calls: number;
  avgMs: number;
  avgTokens: number | null;
  avgOutput: number | null;
  avgCost: number | null;
  cost: number;
  costShare: number;
  fails: number;
  again: number;
  loops: number;
  signals: Signal[];
};
export type IdeaRow = { ideaId: string; calls: number; tokens: number; cost: number; lastAt: string };
export type UsageSummary = {
  calls: number;
  tokens: number;
  cost: number;
  from: string | null;
  to: string | null;
  features: FeatureRow[];
  ideas: IdeaRow[];
};

const hasTokens = (e: UsageEntry) => e.input !== null || e.cacheWrite !== null || e.cacheRead !== null || e.output !== null;
export const totalTokens = (e: UsageEntry) => (e.input ?? 0) + (e.cacheWrite ?? 0) + (e.cacheRead ?? 0) + (e.output ?? 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function summarizeUsage(all: UsageEntry[], ideaId?: string): UsageSummary {
  const entries = ideaId === undefined ? all : all.filter((e) => e.ideaId === ideaId);
  const cost = sum(entries.map((e) => e.costUSD ?? 0));
  const times = entries.map((e) => e.at).sort();

  const groups = new Map<string, UsageEntry[]>();
  for (const e of entries) {
    const k = `${e.feature}:${e.key}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const many = groups.size >= 2;
  const features: FeatureRow[] = [...groups.values()].map((g) => {
    const measured = g.filter(hasTokens);
    const priced = g.filter((e) => e.costUSD !== null);
    const fCost = sum(g.map((e) => e.costUSD ?? 0));
    const costShare = cost > 0 ? fCost / cost : 0;
    const fails = g.filter((e) => !e.ok).length;
    const again = g.filter((e) => e.again).length;
    const loops = g.filter((e) => (e.turns ?? 0) > 1).length;
    const signals: Signal[] = [];
    if (many && costShare >= SIGNAL.heavyShare) signals.push('heavy');
    if (loops > 0) signals.push('loops');
    if (g.length >= SIGNAL.redoMin && again / g.length >= SIGNAL.redoShare) signals.push('redo');
    if (fails > 0) signals.push('fails');
    return {
      feature: g[0].feature,
      key: g[0].key,
      calls: g.length,
      avgMs: avg(g.map((e) => e.ms)) ?? 0,
      avgTokens: avg(measured.map(totalTokens)),
      avgOutput: avg(measured.filter((e) => e.output !== null).map((e) => e.output!)),
      avgCost: avg(priced.map((e) => e.costUSD!)),
      cost: fCost,
      costShare,
      fails,
      again,
      loops,
      signals,
    };
  });
  features.sort((a, b) => b.cost - a.cost || b.calls - a.calls);

  const byIdea = new Map<string, UsageEntry[]>();
  for (const e of entries) if (e.ideaId) byIdea.set(e.ideaId, [...(byIdea.get(e.ideaId) ?? []), e]);
  const ideas: IdeaRow[] = [...byIdea.entries()].map(([id, g]) => ({
    ideaId: id,
    calls: g.length,
    tokens: sum(g.map(totalTokens)),
    cost: sum(g.map((e) => e.costUSD ?? 0)),
    lastAt: g.map((e) => e.at).sort().at(-1)!,
  }));
  ideas.sort((a, b) => b.cost - a.cost || b.calls - a.calls);

  return {
    calls: entries.length,
    tokens: sum(entries.map(totalTokens)),
    cost,
    from: times[0] ?? null,
    to: times.at(-1) ?? null,
    features,
    ideas,
  };
}

const one = (n: number) => (Math.round(n * 10) / 10).toString();
export function formatTokens(n: number): string {
  if (n >= 10_000) return `${one(n / 10_000)}만`;
  if (n >= 1_000) return `${one(n / 1_000)}천`;
  return String(Math.round(n));
}
export function formatCost(usd: number): string {
  if (usd === 0) return '0달러';
  if (usd < 0.005) return '0.01달러 미만';
  return `${usd.toFixed(2)}달러`;
}
