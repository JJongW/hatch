import { CHAIN_RULES, INPUT_HEADING, missingNote } from '@/lib/prompts/context';

/** 공통 규칙 + 단계 지시 + (빠진 문서 안내) + 입력 문서들. 문장은 prompts에만 있고 여기선 이어 붙이기만 */
export function buildPrompt(stepPrompt: string, inputs: { label: string; body: string }[], missing: string[] = []) {
  const blocks = inputs.map((i) => `### ${i.label}\n${i.body}`);
  return [CHAIN_RULES, stepPrompt, ...(missing.length ? [missingNote(missing)] : []), INPUT_HEADING, ...blocks].join('\n\n');
}
