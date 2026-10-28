import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { DOC_FILE_VERSION, DOC_STEPS, type Doc, type DocKey, type Idea } from './types';

const RUNNING_TTL_MS = 10 * 60_000;

export const ideaSource = (idea: Pick<Idea, 'title' | 'memo'>) => `# ${idea.title}\n\n${idea.memo}`.trim();
export const hashOf = (text: string) => crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 12);

const stepOf = (key: DocKey) => DOC_STEPS.find((s) => s.key === key)!;
const docPath = (id: string, key: DocKey) => path.join(ideaDir(id), stepOf(key).file);
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, ''); // 20261028T091500

async function readRaw(id: string, key: DocKey) {
  return fs.readFile(docPath(id, key), 'utf8').catch((e) => {
    if (isMissing(e)) return null;
    throw e;
  });
}

/** 덮어쓰기 전에 이전 판을 .history/로 (지우지 않는다) */
async function keepHistory(id: string, key: DocKey) {
  const from = docPath(id, key);
  const exists = await fs.stat(from).then(() => true, () => false);
  if (!exists) return;
  const dir = path.join(ideaDir(id), '.history');
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(from, path.join(dir, `${key}-${stamp()}-${crypto.randomBytes(2).toString('hex')}.md`));
}

export async function getDocs(id: string): Promise<Doc[]> {
  assertValidId(id);
  const idea = await getIdea(id);
  const parsed = await Promise.all(
    DOC_STEPS.map(async (step) => {
      const raw = await readRaw(id, step.key);
      if (raw === null) return { step, body: null, sourceHash: undefined };
      const { data, content } = matter(raw);
      return { step, body: content.trim(), sourceHash: typeof data.sourceHash === 'string' ? data.sourceHash : undefined };
    }),
  );
  const bodyOf = (from: DocKey | 'idea') =>
    from === 'idea' ? (idea ? ideaSource(idea) : null) : (parsed.find((p) => p.step.key === from)?.body ?? null);

  return parsed.map(({ step, body, sourceHash }) => {
    const source = bodyOf(step.from);
    const stale = body !== null && sourceHash !== undefined && source !== null && sourceHash !== hashOf(source);
    return { ...step, content: body, stale };
  });
}

export async function saveDoc(id: string, key: DocKey, body: string, meta: { sourceHash: string }) {
  assertValidId(id);
  await keepHistory(id, key);
  const front = { generatedAt: new Date().toISOString(), sourceHash: meta.sourceHash, version: DOC_FILE_VERSION };
  await fs.writeFile(docPath(id, key), matter.stringify(body.trim() + '\n', front));
}

export async function updateDocBody(id: string, key: DocKey, body: string) {
  assertValidId(id);
  const raw = await readRaw(id, key);
  if (raw === null) throw new StorageError('문서를 찾을 수 없어요. 먼저 만들어 주세요.');
  const { data } = matter(raw);
  await keepHistory(id, key);
  await fs.writeFile(docPath(id, key), matter.stringify(body.trim() + '\n', data));
}

const runningFile = (id: string) => path.join(ideaDir(id), '.running.json');

export async function getRunning(id: string): Promise<{ key: DocKey; startedAt: string } | null> {
  assertValidId(id);
  const raw = await fs.readFile(runningFile(id), 'utf8').catch(() => null);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    if (Date.now() - Date.parse(r.startedAt) > RUNNING_TTL_MS) return null;
    return { key: r.key, startedAt: r.startedAt };
  } catch {
    return null;
  }
}

export async function markRunning(id: string, key: DocKey) {
  assertValidId(id);
  await fs.writeFile(runningFile(id), JSON.stringify({ key, startedAt: new Date().toISOString() }));
}

/** 표시 파일 하나를 치운다 (생성 상태 표시일 뿐 사용자 데이터가 아님) */
export async function clearRunning(id: string) {
  assertValidId(id);
  await fs.rm(runningFile(id), { force: true });
}
