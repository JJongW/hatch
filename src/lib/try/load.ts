import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { DEMO_SAMPLE_IDEA } from '../demo';
import { DOC_STEPS, type DocKey, type QuestionSet } from '../storage/types';

import { vocLines } from '../tools/voc/compute';

import type { TryFixture } from './flow';

// 체험 예시는 저장소의 demo-data에서 읽는다. HATCH_DATA_DIR(내 데이터)와 상관없이 늘 같은 예시 (spec §4)
const DIR = path.join(process.cwd(), 'demo-data', 'ideas', DEMO_SAMPLE_IDEA);
const PRD_REVIEWS = ['prd-review-20261028T081506-d120', 'prd-review-20261028T081630-32ac'] as const;
const VOC = 'voc-20261028T092554-ba66';

const read = async (...p: string[]) => matter(await fs.readFile(path.join(DIR, ...p), 'utf8'));
const body = async (...p: string[]) => (await read(...p)).content.trim();

/** 붙여넣기 예시: 결과에 원문(lines)이 있으면 그대로, 없는 예전 결과는 대표 의견만 (전체 원문이 없다는 것은 화면에서 밝힌다) */
function vocInput(data: unknown): string {
  const saved = vocLines(data);
  if (saved) return saved.join('\n');
  const topics = (data as { topics?: { top?: { line: number; text: string }[] }[] } | null)?.topics ?? [];
  const lines = new Map(topics.flatMap((t) => t.top ?? []).map((v) => [v.line, v.text]));
  return [...lines].sort(([a], [b]) => a - b).map(([, text]) => text).join('\n');
}

export async function loadTryFixture(): Promise<Omit<TryFixture, 'tools'>> {
  const [idea, docs, q, reviews, voc] = await Promise.all([
    read('idea.md'),
    Promise.all(DOC_STEPS.map(async (s) => [s.key, await body('docs', s.file)] as const)),
    read('questions.md'),
    Promise.all(PRD_REVIEWS.map((id) => body('tools', `${id}.md`))),
    read('tools', `${VOC}.md`),
  ]);
  const vocData: unknown = typeof voc.data.data === 'string' ? JSON.parse(voc.data.data) : null;
  return {
    idea: { title: String(idea.data.title), memo: idea.content.trim() },
    docs: Object.fromEntries(docs) as Record<DocKey, string>,
    questions: { createdAt: String(q.data.createdAt), labels: q.data.labels, items: q.data.items } as QuestionSet,
    prdReviews: [reviews[0], reviews[1]],
    voc: { input: vocInput(vocData), body: voc.content.trim(), data: vocData },
  };
}
