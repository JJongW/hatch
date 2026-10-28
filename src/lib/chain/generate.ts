import 'server-only';

import { z } from 'zod';

import { BUSY_MESSAGE, ChainError, isClaudeBusy, runClaude } from '@/lib/claude/run';
import {
  clearRunning, DOC_STEPS, getDocs, getIdea, hashOf, ideaSource, markRunning, saveDoc, type DocKey,
} from '@/lib/storage';

import { buildPrompt } from './build-prompt';
import { CHAIN } from './registry';

/** claude --json-schema는 $schema 키(draft URL)를 못 풀어 실패한다. 최상위 $schema만 뺀다 */
export function toClaudeSchema(schema: z.ZodType): object {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/** 앞 문서 읽기 → 프롬프트 → claude → 형식 검사 → md 저장 */
export async function generateDoc(id: string, key: DocKey) {
  const step = CHAIN[key];
  const meta = DOC_STEPS.find((s) => s.key === key);
  if (!step || !meta) throw new ChainError('아직 만들 수 없는 문서예요.');

  const idea = await getIdea(id);
  if (!idea) throw new ChainError('아이디어를 찾을 수 없어요.');
  const docs = await getDocs(id);
  const bodyOf = (k: DocKey) => docs.find((d) => d.key === k)?.content ?? null;

  const source = meta.from === 'idea' ? ideaSource(idea) : bodyOf(meta.from);
  if (!source) throw new ChainError('앞 문서를 먼저 만들어 주세요.');

  const labelOf = (k: DocKey | 'idea') => (k === 'idea' ? '아이디어' : DOC_STEPS.find((s) => s.key === k)!.label);
  const extras = (step.extra ?? []).map((k) => ({ label: labelOf(k), body: bodyOf(k) }));
  if (extras.some((e) => !e.body)) throw new ChainError('앞 문서를 먼저 만들어 주세요.');
  const inputs = [{ label: labelOf(meta.from), body: source }, ...extras.map((e) => ({ label: e.label, body: e.body! }))];

  // 실행 중이면 남의 생성 중 표시를 건드리기 전에 거부
  if (isClaudeBusy()) throw new ChainError(BUSY_MESSAGE);
  await markRunning(id, key);
  try {
    const raw = await runClaude({ prompt: buildPrompt(step.prompt, inputs), jsonSchema: toClaudeSchema(step.schema) });
    const parsed = step.schema.safeParse(raw);
    if (!parsed.success) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    await saveDoc(id, key, step.render(parsed.data), { sourceHash: hashOf(source) });
  } finally {
    await clearRunning(id);
  }
}
