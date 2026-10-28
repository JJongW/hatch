import 'server-only';

import { z } from 'zod';

import { ChainError, runClaude } from '@/lib/claude/run';
import {
  clearRunning, DOC_STEPS, getDocs, getIdea, hashOf, ideaSource, markRunning, saveDoc, type DocKey,
} from '@/lib/storage';

import { buildPrompt } from './build-prompt';
import { CHAIN } from './registry';

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
  const inputs = [
    { label: labelOf(meta.from), body: source },
    ...(step.extra ?? []).flatMap((k) => (bodyOf(k) ? [{ label: labelOf(k), body: bodyOf(k)! }] : [])),
  ];

  await markRunning(id, key);
  try {
    const raw = await runClaude({ prompt: buildPrompt(step.prompt, inputs), jsonSchema: z.toJSONSchema(step.schema) });
    const parsed = step.schema.safeParse(raw);
    if (!parsed.success) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    await saveDoc(id, key, step.render(parsed.data), { sourceHash: hashOf(source) });
  } finally {
    await clearRunning(id);
  }
}
