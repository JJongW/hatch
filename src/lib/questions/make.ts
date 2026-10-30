import 'server-only';

import { toClaudeSchema } from '@/lib/claude/schema';
import { ChainError, runClaude } from '@/lib/claude/run';
import { INPUT_HEADING } from '@/lib/prompts/context';
import { QUESTIONS_HEADINGS, QUESTIONS_PROMPT, QUESTIONS_RULES } from '@/lib/prompts/questions';
import { getDocs, getIdea, getQuestions, listDecisions, projectBlock, saveQuestions, type QuestionSet } from '@/lib/storage';

import { collectUnknowns, QUESTION_LABEL_MAX, type UnknownGroup } from './collect';
import { questionsSchema, validateQuestions } from './validate';

/** 규칙 + 할 일 + 입력(아이디어 · 맥락/결정 블록 · 라벨 목록). 문장은 prompts에만 있고 여기선 이어 붙이기만 */
export function questionsPrompt(idea: { title: string; memo: string }, project: string, groups: UnknownGroup[]) {
  const list = groups.map((g) => [`- ${g.label} (${g.count}곳)`, ...g.examples.map((e) => `  - ${e.doc}: ${e.line}`)].join('\n'));
  return [
    QUESTIONS_RULES,
    QUESTIONS_PROMPT,
    INPUT_HEADING,
    `${QUESTIONS_HEADINGS.idea}\n${`# ${idea.title}\n\n${idea.memo}`.trim()}`,
    project,
    `${QUESTIONS_HEADINGS.list}\n${list.join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** 문서 라벨 모으기 → claude → 검사 → questions.md 저장 (claude 잠금은 문서 생성과 같이 쓴다) */
export async function makeQuestions(id: string): Promise<QuestionSet> {
  const idea = await getIdea(id);
  if (!idea) throw new ChainError('아이디어를 찾을 수 없어요.');
  const [docs, decisions, before] = await Promise.all([getDocs(id), listDecisions(id), getQuestions(id)]);
  const groups = collectUnknowns(docs).groups.slice(0, QUESTION_LABEL_MAX);
  if (groups.length === 0) throw new ChainError('질문으로 만들 [확인 필요]가 없어요.');
  const raw = await runClaude({
    prompt: questionsPrompt(idea, projectBlock(idea.context, decisions), groups),
    jsonSchema: toClaudeSchema(questionsSchema),
    tag: { feature: 'questions', key: 'questions', ideaId: id, again: before !== null },
  });
  const labels = groups.map((g) => g.label);
  const items = validateQuestions(labels, raw);
  if (!items) throw new ChainError('질문을 다 만들지 못했어요. 다시 눌러 주세요.');
  return saveQuestions(id, { labels, items });
}
