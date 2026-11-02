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
  tool: {
    key: ToolKey;
    label: string;
    description: string;
    continueLabel: string | null;
    runningLabel: string;
    runningSteps: readonly string[];
    inputLabel: string;
    sourceOptional: boolean;
    /** accepts의 라벨, 문서가 없을 때 안내에 쓴다 */
    acceptsLabels: string[];
  };
  /** accepts 순서, 있는 문서만 */
  ideas: { id: string; title: string; docs: { key: DocKey; label: string }[] }[];
  /** ?idea= (유효하지 않으면 null = 붙여넣기) */
  ideaId: string | null;
  /** 아이디어가 없고 sourceOptional이면 기본 true, ?source=pasted면 false — 결과 · 지난 결과가 '문서 없이' 것 */
  none: boolean;
  /** 이 아이디어(또는 붙여넣기)의 이 도구 결과, 최신순. createdAt · source는 표시용 문자열 (문서 이름 또는 '붙여넣기') */
  results: { id: string; createdAt: string; source: string }[];
  /** ?result= 또는 최신 결과. data = compute 결과 (도구 페이지가 요약 화면을 그릴 때 해석한다) */
  current: { id: string; body: string; data: unknown } | null;
  busy: boolean;
};

const labelOf = (key: string) =>
  key === 'pasted' ? '붙여넣기' : key === 'none' ? '문서 없이' : (DOC_STEPS.find((s) => s.key === key)?.label ?? key);

// 날짜는 서버에서 문자열로 (hydration 차이 방지)
const formatDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

export async function loadToolPage(
  key: ToolKey,
  searchParams: Promise<{ idea?: string; result?: string; source?: string }>,
): Promise<ToolFrameData> {
  const tool = TOOLS[key];
  if (!tool) notFound();
  const { idea, result, source } = await searchParams;

  const { ideas: all } = await listIdeas();
  const ideaId = idea && isValidId(idea) && all.some((i) => i.id === idea) ? idea : null;

  const ideas = await Promise.all(
    all.map(async (i) => {
      const docs = await getDocs(i.id);
      const has = (k: DocKey) => docs.some((d) => d.key === k && d.content !== null);
      return { id: i.id, title: i.title, docs: tool.accepts.filter(has).map((k) => ({ key: k, label: labelOf(k) })) };
    }),
  );

  // 붙여넣기 · 문서 없이 결과는 같은 tools/ 폴더에 있다 → 탭에 맞는 것만
  // 문서 없이 실행하는 도구는 '문서 없이'가 기본, 붙여넣기는 ?source=pasted (spec §2)
  const none = ideaId === null && tool.sourceOptional === true && source !== 'pasted';
  const only = ideaId !== null ? undefined : none ? 'none' : 'pasted';
  const list = await listToolResults(key, ideaId, only);
  const results = list.map((r) => ({ id: r.id, createdAt: formatDate(r.createdAt), source: labelOf(r.source) }));

  const picked = result && isValidResultId(result) ? await getToolResult(ideaId, result) : null;
  const cur = picked && picked.tool === key && (!only || picked.source === only) ? picked : (list[0] ?? null);

  return {
    tool: {
      key,
      label: tool.label,
      description: tool.description,
      continueLabel: tool.continueLabel ?? null,
      runningLabel: tool.runningLabel ?? '실행 중이에요 (1~2분)',
      runningSteps: tool.runningSteps ?? [],
      inputLabel: tool.inputLabel ?? '도구 입력',
      sourceOptional: tool.sourceOptional === true,
      acceptsLabels: tool.accepts.map(labelOf),
    },
    ideas,
    ideaId,
    none,
    results,
    current: cur ? { id: cur.id, body: cur.body, data: cur.data } : null,
    busy: isClaudeBusy(),
  };
}
