import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { assertValidId } from './ids';
import { isMissing, toolsDir } from './paths';

export type ToolResult = {
  id: string;
  tool: string;
  ideaId: string | null;
  createdAt: string;
  /** DocKey 또는 'pasted' */
  source: string;
  sourceHash: string;
  prevId: string | null;
  /** 계산 결과. 도구가 해석한다 (재리뷰 · 다음 라운드가 읽음) */
  data: unknown;
  body: string;
};

export const TOOL_RESULT_VERSION = 1;
const TOOL_PATTERN = /^[a-z][a-z-]*$/;
const RESULT_PATTERN = /^[a-z][a-z-]*-\d{8}T\d{6}-[0-9a-f]{4}$/;

export const isValidResultId = (id: string) => RESULT_PATTERN.test(id);

function assertTool(tool: string) {
  if (!TOOL_PATTERN.test(tool)) throw new Error(`잘못된 도구 이름이에요: ${tool}`);
}
function assertResultId(id: string) {
  if (!isValidResultId(id)) throw new Error(`잘못된 결과 id예요: ${id}`);
}
const dirOf = (ideaId: string | null) => {
  if (ideaId !== null) assertValidId(ideaId);
  return toolsDir(ideaId);
};
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); // 20261028T091500

function parse(raw: string, id: string, ideaId: string | null): ToolResult | null {
  try {
    const { data: f, content } = matter(raw);
    return {
      id,
      tool: String(f.tool ?? ''),
      ideaId,
      createdAt: String(f.createdAt ?? ''),
      source: String(f.source ?? ''),
      sourceHash: String(f.sourceHash ?? ''),
      prevId: typeof f.prevId === 'string' ? f.prevId : null,
      data: typeof f.data === 'string' ? JSON.parse(f.data) : null,
      body: content.trim(),
    };
  } catch {
    return null; // 깨진 파일은 건너뛴다
  }
}

export async function saveToolResult(r: Omit<ToolResult, 'id' | 'createdAt'>): Promise<string> {
  assertTool(r.tool);
  const dir = dirOf(r.ideaId);
  await fs.mkdir(dir, { recursive: true });
  const id = `${r.tool}-${stamp()}-${crypto.randomBytes(2).toString('hex')}`;
  const front = {
    tool: r.tool,
    createdAt: new Date().toISOString(),
    source: r.source,
    sourceHash: r.sourceHash,
    ...(r.prevId ? { prevId: r.prevId } : {}),
    version: TOOL_RESULT_VERSION,
    data: JSON.stringify(r.data), // YAML 특수문자 걱정 없이 한 줄 JSON으로
  };
  // 본문이 `---`로 시작해도 머리말로 읽히지 않게 머리말만 만들고 본문은 이어 붙인다 (docs.ts와 같음)
  await fs.writeFile(path.join(dir, `${id}.md`), matter.stringify('', front) + '\n' + r.body.trim() + '\n', { flag: 'wx' });
  return id;
}

export async function getToolResult(ideaId: string | null, id: string): Promise<ToolResult | null> {
  assertResultId(id);
  const raw = await fs.readFile(path.join(dirOf(ideaId), `${id}.md`), 'utf8').catch((e) => {
    if (isMissing(e)) return null;
    throw e;
  });
  return raw === null ? null : parse(raw, id, ideaId);
}

export async function listToolResults(tool: string, ideaId: string | null): Promise<ToolResult[]> {
  assertTool(tool);
  let files: string[];
  try {
    files = await fs.readdir(dirOf(ideaId));
  } catch (e) {
    if (isMissing(e)) return [];
    throw e;
  }
  const ids = files
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .filter((id) => isValidResultId(id) && id.startsWith(`${tool}-`) && /^\d{8}T/.test(id.slice(tool.length + 1)))
    .sort()
    .reverse(); // id에 시각이 들어 있어 이름순 = 시간순
  const results = await Promise.all(ids.map((id) => getToolResult(ideaId, id)));
  return results.filter((r): r is ToolResult => r !== null);
}
