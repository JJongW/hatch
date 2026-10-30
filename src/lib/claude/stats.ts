import type { UsageEntry } from '@/lib/storage';

export type RunStats = Pick<UsageEntry, 'turns' | 'input' | 'cacheWrite' | 'cacheRead' | 'output' | 'costUSD' | 'model'>;

const EMPTY: RunStats = { turns: null, input: null, cacheWrite: null, cacheRead: null, output: null, costUSD: null, model: null };
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** claude -p --output-format json 결과에서 사용량 숫자만 꺼낸다. 결과가 없거나 깨졌으면 모두 null */
export function statsOf(stdout: string | null): RunStats {
  if (!stdout) return EMPTY;
  let r: { total_cost_usd?: unknown; usage?: Record<string, unknown>; modelUsage?: Record<string, unknown> };
  try {
    r = JSON.parse(stdout);
  } catch {
    return EMPTY;
  }
  if (!r || typeof r !== 'object') return EMPTY; // null이나 숫자면 finally에서 터지지 않게
  const u = r.usage ?? {};
  return {
    // num_turns는 --json-schema면 결과 도구 호출 때문에 늘 2다. 실제 모델 호출 횟수는 iterations 길이 (2026-10-30 확인)
    turns: Array.isArray(u.iterations) ? u.iterations.length : null,
    input: num(u.input_tokens),
    cacheWrite: num(u.cache_creation_input_tokens),
    cacheRead: num(u.cache_read_input_tokens),
    output: num(u.output_tokens),
    costUSD: num(r.total_cost_usd),
    model: Object.keys(r.modelUsage ?? {})[0] ?? null,
  };
}
