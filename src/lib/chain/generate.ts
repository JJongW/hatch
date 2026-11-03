import 'server-only';

import { toClaudeSchema } from '@/lib/claude/schema';
import { BUSY_MESSAGE, ChainError, isClaudeBusy, runClaude } from '@/lib/claude/run';
import {
  clearRunning, DOC_STEPS, getDocs, getIdea, hashOf, ideaSource, inputHashes, listDecisions, listEvidence, markRunning, saveDoc, saveDraft, type DocKey,
} from '@/lib/storage';

import { buildPrompt } from './build-prompt';
import { CHAIN } from './registry';

export { toClaudeSchema };

/** 앞 문서 읽기 → 프롬프트 → claude → 형식 검사 → md 저장. 이미 있는 문서면 초안으로 (적용은 사람이 고른다) */
export async function generateDoc(id: string, key: DocKey) {
  const step = CHAIN[key];
  const meta = DOC_STEPS.find((s) => s.key === key);
  if (!step || !meta) throw new ChainError('아직 만들 수 없는 문서예요.');

  const idea = await getIdea(id);
  if (!idea) throw new ChainError('아이디어를 찾을 수 없어요.');
  const docs = await getDocs(id);
  const [decisions, evidence] = await Promise.all([listDecisions(id), listEvidence(id)]);
  const bodyOf = (k: DocKey) => docs.find((d) => d.key === k)?.content ?? null;

  const source = meta.from === 'idea' ? ideaSource(idea, decisions, evidence) : bodyOf(meta.from);
  if (!source) throw new ChainError('앞 문서를 먼저 만들어 주세요.');

  const labelOf = (k: DocKey | 'idea') => (k === 'idea' ? '아이디어' : DOC_STEPS.find((s) => s.key === k)!.label);
  const extras = (meta.extra ?? []).map((k) => ({ label: labelOf(k), body: bodyOf(k) }));
  if (extras.some((e) => !e.body)) throw new ChainError('앞 문서를 먼저 만들어 주세요.');
  const inputs = [{ label: labelOf(meta.from), body: source }, ...extras.map((e) => ({ label: e.label, body: e.body! }))];

  const again = bodyOf(key) !== null; // 이미 있던 문서를 다시 만듦 (낭비 신호). 문서를 쓰기 전에 읽는다

  // 실행 중이면 남의 생성 중 표시를 건드리기 전에 거부
  if (isClaudeBusy()) throw new ChainError(BUSY_MESSAGE);
  await markRunning(id, key);
  try {
    const raw = await runClaude({
      prompt: buildPrompt(step.prompt, inputs),
      jsonSchema: toClaudeSchema(step.schema),
      tag: { feature: 'doc', key, ideaId: id, again },
    });
    const parsed = step.schema.safeParse(raw);
    if (!parsed.success) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    // 입력 조각별 해시를 같이 남겨, 나중에 무엇이 바뀌었는지(앞 문서 · 결정 · 근거) 알린다
    const docMeta = { sourceHash: hashOf(source), inputs: inputHashes(key, { idea, decisions, evidence, bodyOf }) };
    await (again ? saveDraft : saveDoc)(id, key, step.render(parsed.data), docMeta);
  } finally {
    await clearRunning(id);
  }
}
