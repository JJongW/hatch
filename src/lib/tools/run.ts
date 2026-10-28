import 'server-only';

import { BUSY_MESSAGE, ChainError, isClaudeBusy, runClaude } from '@/lib/claude/run';
import { toClaudeSchema } from '@/lib/claude/schema';
import { INPUT_HEADING, SOURCE_HEADING, TOOL_RULES } from '@/lib/prompts/context';
import { getDocs, getToolResult, hashOf, saveToolResult } from '@/lib/storage';

import type { AnyToolDef, ToolSource } from './types';

export const MAX_SOURCE_CHARS = 30_000;

async function readSource(tool: AnyToolDef, source: ToolSource) {
  if ('none' in source) return { text: '', label: 'none', ideaId: null };
  if ('pasted' in source) return { text: source.pasted.trim(), label: 'pasted', ideaId: null };
  if (!tool.accepts.includes(source.docKey)) return { text: '', label: source.docKey, ideaId: source.ideaId };
  const doc = (await getDocs(source.ideaId)).find((d) => d.key === source.docKey);
  return { text: doc?.content?.trim() ?? '', label: source.docKey, ideaId: source.ideaId };
}

/** 입력 문서 확정 → 입력 칸 검사 → 프롬프트 → claude → 형식 검사 → 계산 → md 저장 */
export async function runTool(
  tool: AnyToolDef,
  { source, input, prevId = null }: { source: ToolSource; input: Record<string, string>; prevId?: string | null },
) {
  const { text, label, ideaId } = await readSource(tool, source);
  if (!text && !tool.sourceOptional) throw new ChainError('입력 문서를 골라 주세요.');
  if (text.length > MAX_SOURCE_CHARS) throw new ChainError('입력이 너무 길어요 (최대 30,000자).');

  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) throw new ChainError(parsed.error.issues[0]?.message || '입력 칸을 확인해 주세요.');

  let prev = null;
  if (prevId) {
    const r = await getToolResult(ideaId, prevId).catch(() => null);
    if (!r || r.tool !== tool.key) throw new ChainError('이전 결과를 찾을 수 없어요.');
    prev = r.data;
  }

  const invalid = tool.validate?.(parsed.data, prev);
  if (invalid) throw new ChainError(invalid);

  if (isClaudeBusy()) throw new ChainError(BUSY_MESSAGE);
  const prompt = [TOOL_RULES, tool.prompt, INPUT_HEADING, text && `${SOURCE_HEADING}\n${text}`, tool.promptInput(parsed.data, prev)]
    .filter(Boolean)
    .join('\n\n');
  const raw = await runClaude({ prompt, jsonSchema: toClaudeSchema(tool.outputSchema) });
  const out = tool.outputSchema.safeParse(raw);
  if (!out.success) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');

  const res = tool.compute(out.data, parsed.data, prev);
  const resultId = await saveToolResult({
    tool: tool.key, ideaId, source: label, sourceHash: hashOf(text), prevId, data: res, body: tool.render(res),
  });
  return { resultId, ideaId };
}
