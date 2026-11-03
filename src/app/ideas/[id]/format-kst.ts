// 한국 시각 "2026.11.3 17:18". Intl을 쓰지 않아 서버 · 브라우저 결과가 같다 (client 컴포넌트에서 써도 hydration 차이 없음)
const KST = 9 * 60 * 60 * 1000;
const two = (n: number) => String(n).padStart(2, '0');

export function formatKst(iso: string): string {
  const t = Date.parse(iso);
  if (!iso || Number.isNaN(t)) return '';
  const d = new Date(t + KST);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
}
