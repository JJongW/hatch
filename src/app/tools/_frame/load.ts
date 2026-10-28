import 'server-only';

import { notFound } from 'next/navigation';

import {
  DOC_STEPS,
  getDocs,
  getToolResult,
  isValidId,
  isValidResultId,
  listIdeas,
  listToolResults,
  type DocKey,
} from '@/lib/storage';
import { isClaudeBusy, TOOLS, type ToolKey } from '@/lib/tools';

export type ToolFrameData = {
  tool: { key: ToolKey; label: string; description: string; continueLabel: string | null };
  /** accepts 순서, 있는 문서만 */
  ideas: { id: string; title: string; docs: { key: DocKey; label: string }[] }[];
  /** ?idea= (유효하지 않으면 null = 붙여넣기) */
  ideaId: string | null;
  /** 이 아이디어(또는 붙여넣기)의 이 도구 결과, 최신순. createdAt · source는 표시용 문자열 (문서 이름 또는 '붙여넣기') */
  results: { id: string; createdAt: string; source: string }[];
  /** ?result= 또는 최신 결과 */
  current: { id: string; body: string } | null;
  busy: boolean;
};

const labelOf = (key: string) =>
  key === 'pasted' ? '붙여넣기' : (DOC_STEPS.find((s) => s.key === key)?.label ?? key);

// 날짜는 서버에서 문자열로 (hydration 차이 방지)
const formatDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

export async function loadToolPage(
  key: ToolKey,
  searchParams: Promise<{ idea?: string; result?: string }>,
): Promise<ToolFrameData> {
  const tool = TOOLS[key];
  if (!tool) notFound();
  const { idea, result } = await searchParams;

  const { ideas: all } = await listIdeas();
  const ideaId = idea && isValidId(idea) && all.some((i) => i.id === idea) ? idea : null;

  const ideas = await Promise.all(
    all.map(async (i) => {
      const docs = await getDocs(i.id);
      const has = (k: DocKey) => docs.some((d) => d.key === k && d.content !== null);
      return { id: i.id, title: i.title, docs: tool.accepts.filter(has).map((k) => ({ key: k, label: labelOf(k) })) };
    }),
  );

  const list = await listToolResults(key, ideaId);
  const results = list.map((r) => ({ id: r.id, createdAt: formatDate(r.createdAt), source: labelOf(r.source) }));

  const picked = result && isValidResultId(result) ? await getToolResult(ideaId, result) : null;
  const cur = picked && picked.tool === key ? picked : (list[0] ?? null);

  return {
    tool: { key, label: tool.label, description: tool.description, continueLabel: tool.continueLabel ?? null },
    ideas,
    ideaId,
    results,
    current: cur ? { id: cur.id, body: cur.body } : null,
    busy: isClaudeBusy(),
  };
}
