// 메뉴 막대 빠른 아이디어 (spec 2026-11-04-macos-app §3-4). 첫 줄이 제목, 나머지가 메모
export const QUICK_MAX = 2000;

export function splitQuick(text: unknown): { title: string; memo: string } | { error: string } {
  if (typeof text !== 'string' || !text.trim()) return { error: '아이디어를 적어 주세요.' };
  if (text.length > QUICK_MAX) return { error: '2,000자까지 적을 수 있어요.' };
  const [first, ...rest] = text.trim().split(/\r?\n/);
  return { title: first.trim(), memo: rest.join('\n').trim() };
}
