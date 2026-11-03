import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { PROJECT_BLOCK } from '@/lib/prompts/context';

import { listDecisions } from './decisions';
import { listEvidence } from './evidence';
import { HISTORY_DIR, keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import {
  CONTEXT_FIELDS,
  DOC_FILE_VERSION,
  DOC_STEPS,
  EVIDENCE_SOURCES,
  type Decision,
  type Doc,
  type DocChange,
  type DocDraft,
  type DocKey,
  type DocVersion,
  type Evidence,
  type Idea,
  type IdeaContext,
} from './types';

const RUNNING_TTL_MS = 10 * 60_000;

const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');
const stepOf = (key: DocKey) => DOC_STEPS.find((s) => s.key === key)!;
/** Server Action 인자는 클라이언트가 바꿀 수 있다: 경로 · 정규식에 쓰기 전에 아는 key인지 본다 */
function assertKey(key: string): asserts key is DocKey {
  if (!DOC_STEPS.some((s) => s.key === key)) throw new StorageError('모르는 문서예요.');
}

const B = PROJECT_BLOCK;
const block = (heading: string, lines: string[]) => (lines.length ? `${heading}\n${lines.join('\n')}` : '');
const joined = (parts: string[]) => parts.filter(Boolean).join('\n\n');

const contextBlock = (context: IdeaContext) =>
  block(B.context, CONTEXT_FIELDS.filter((f) => context[f.key].trim()).map((f) => `- ${f.label}: ${oneLine(context[f.key])}`));

/** 정함 · 보류만. 제안은 팀이 확정하기 전이라 넣지 않는다 */
const decisionBlock = (decisions: Decision[]) =>
  joined([
    block(B.decided, decisions.filter((d) => d.status === 'decided').map((d) => `- ${oneLine(d.question)} → ${oneLine(d.answer)} (${B.reason}: ${oneLine(d.reason)})`)),
    block(B.deferred, decisions.filter((d) => d.status === 'deferred').map((d) => `- ${oneLine(d.question)} (${B.deferReason}: ${oneLine(d.reason)})`)),
  ]);

const sourceLabel = (e: Evidence) => [EVIDENCE_SOURCES.find((x) => x.key === e.source)?.label, e.sourceNote && oneLine(e.sourceNote)].filter(Boolean).join(', ');
const evidenceBlock = (evidence: Evidence[]) =>
  block(B.evidence, evidence.map((e) => `- ${oneLine(e.text)} (${B.source}: ${sourceLabel(e)})`));

/** 맥락 · 정한 것 · 보류한 것 블록. 모두 비면 '' — 그래야 기존 아이디어의 입력 · 해시가 그대로다 (도구 · 확인 질문 입력) */
export function projectBlock(context: IdeaContext, decisions: Decision[] = []): string {
  return joined([contextBlock(context), decisionBlock(decisions)]);
}

const titleMemo = (idea: Pick<Idea, 'title' | 'memo'>) => `# ${idea.title}\n\n${idea.memo}`.trim();

/** 기획안 입력. 근거는 맨 뒤에 붙고, 없으면 블록이 없어 예전 아이디어의 해시가 그대로다 */
export const ideaSource = (idea: Pick<Idea, 'title' | 'memo' | 'context'>, decisions: Decision[] = [], evidence: Evidence[] = []) =>
  joined([titleMemo(idea), contextBlock(idea.context), decisionBlock(decisions), evidenceBlock(evidence)]);

/** 바뀜을 나눠 볼 입력 조각. 기획안은 아이디어 · 결정 · 근거, 나머지는 앞 문서 · extra 문서 (spec 2026-11-03 §2) */
export type InputContext = {
  idea: Pick<Idea, 'title' | 'memo' | 'context'> | null;
  decisions: Decision[];
  evidence: Evidence[];
  bodyOf: (key: DocKey) => string | null;
};

export function inputHashes(key: DocKey, ctx: InputContext): Record<string, string> {
  const step = stepOf(key);
  if (step.from === 'idea') {
    const idea = ctx.idea;
    return {
      idea: hashOf(idea ? joined([titleMemo(idea), contextBlock(idea.context)]) : ''),
      decisions: hashOf(decisionBlock(ctx.decisions)),
      evidence: hashOf(evidenceBlock(ctx.evidence)),
    };
  }
  return Object.fromEntries([step.from, ...(step.extra ?? [])].map((k) => [`doc:${k}`, hashOf(ctx.bodyOf(k) ?? '')]));
}

export const hashOf = (text: string) => crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 12);

// 생성 문서는 <id>/docs/. 예전 자리(<id>/<file>)는 읽기만 대체하고, 쓸 때 keepHistory가 .history/로 옮긴다 (spec 구조화 §4)
const docPath = (id: string, key: DocKey) => path.join(ideaDir(id), 'docs', stepOf(key).file);
const oldDocPath = (id: string, key: DocKey) => path.join(ideaDir(id), stepOf(key).file);

/** 본문을 stringify에 넣으면 `---`로 시작할 때 머리말로 다시 읽히므로, 머리말만 만들고 본문은 이어 붙인다 */
const withFront = (data: Record<string, unknown>, body: string) => matter.stringify('', data) + '\n' + body.trim() + '\n';

async function readRaw(id: string, key: DocKey) {
  for (const p of [docPath(id, key), oldDocPath(id, key)]) {
    try {
      return await fs.readFile(p, 'utf8');
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
  }
  return null;
}

/** 쓰기 전: 두 자리의 지금 판을 .history/로 옮기고 docs/ 폴더를 만든다 */
async function keepOld(id: string, key: DocKey) {
  await keepHistory(id, docPath(id, key), key);
  await keepHistory(id, oldDocPath(id, key), key);
  await fs.mkdir(path.dirname(docPath(id, key)), { recursive: true });
}

const draftPath = (id: string, key: DocKey) => path.join(ideaDir(id), 'drafts', stepOf(key).file);
const isoOf = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : undefined);
const asHashes = (v: unknown) =>
  typeof v === 'object' && v !== null && Object.values(v).every((h) => typeof h === 'string') ? (v as Record<string, string>) : undefined;

type Parsed = { body: string | null; data: Record<string, unknown> };

async function readParsed(p: string | null, raw?: string | null): Promise<Parsed> {
  const text = raw !== undefined ? raw : p ? await fs.readFile(p, 'utf8').catch((e) => (isMissing(e) ? null : Promise.reject(e))) : null;
  if (text === null) return { body: null, data: {} };
  try {
    const { data, content } = matter(text);
    return { body: content.trim(), data };
  } catch {
    // 손으로 쓴 머리말이 깨졌다: 목록 화면 전체가 죽지 않게 통째로 본문 취급
    return { body: text.trim(), data: {} };
  }
}

// .history/<key>-20261103T075121-af5a.md (keepHistory 이름). 초안은 <key>-draft-… 라 빠진다
const versionName = (key: DocKey) => new RegExp(`^${key}-(\\d{8}T\\d{6})-[0-9a-f]{4}\\.md$`);
const stampIso = (st: string) => `${st.slice(0, 4)}-${st.slice(4, 6)}-${st.slice(6, 8)}T${st.slice(9, 11)}:${st.slice(11, 13)}:${st.slice(13, 15)}Z`;

async function listVersions(id: string): Promise<Record<DocKey, DocVersion[]>> {
  const names = await fs.readdir(path.join(ideaDir(id), HISTORY_DIR)).catch(() => [] as string[]);
  return Object.fromEntries(
    DOC_STEPS.map((s) => {
      const re = versionName(s.key);
      const list = names.flatMap((name) => {
        const m = re.exec(name);
        return m ? [{ name, at: stampIso(m[1]) }] : [];
      });
      return [s.key, list.sort((a, b) => (a.name < b.name ? 1 : -1))];
    }),
  ) as Record<DocKey, DocVersion[]>;
}

/** 바뀐 입력 목록. inputs가 있으면 조각별로, 없는 예전 문서는 sourceHash로만 (무엇인지 모름) */
function changesOf(key: DocKey, doc: Parsed, ctx: InputContext, legacySource: string | null): DocChange[] {
  if (doc.body === null) return [];
  const stored = asHashes(doc.data.inputs);
  if (stored) {
    const now = inputHashes(key, ctx);
    return Object.keys(now).filter((k) => (stored[k] ?? hashOf('')) !== now[k]) as DocChange[];
  }
  const sourceHash = typeof doc.data.sourceHash === 'string' ? doc.data.sourceHash : undefined;
  if (sourceHash === undefined || legacySource === null) return []; // 머리말 없는 손글 문서
  // 예전 기획안: 만든 뒤 적은 근거가 있으면 알린다 (시각으로만 안다). 아는 원인을 먼저
  const at = isoOf(doc.data.generatedAt);
  const out: DocChange[] = stepOf(key).from === 'idea' && at && ctx.evidence.some((e) => e.collectedAt > at) ? ['evidence'] : [];
  // 예전 문서의 sourceHash는 앞 문서 본문만 담았다: 앞 문서가 바뀐 것만은 확실히 안다. 기획안은 무엇이 바뀌었는지 모른다
  const from = stepOf(key).from;
  if (sourceHash !== hashOf(legacySource)) out.push(from === 'idea' ? 'unknown' : `doc:${from}`);
  return out;
}

export async function getDocs(id: string): Promise<Doc[]> {
  assertValidId(id);
  const [idea, decisions, evidence, versions] = await Promise.all([
    getIdea(id),
    listDecisions(id),
    listEvidence(id),
    listVersions(id),
  ]);
  const parsed = await Promise.all(
    DOC_STEPS.map(async (step) => ({
      step,
      doc: await readParsed(null, await readRaw(id, step.key)),
      draft: await readParsed(draftPath(id, step.key)),
    })),
  );
  const bodyOf = (key: DocKey) => parsed.find((p) => p.step.key === key)?.doc.body ?? null;
  const ctx: InputContext = { idea, decisions, evidence, bodyOf };

  return parsed.map(({ step, doc, draft }) => {
    // 예전 문서의 sourceHash는 근거 블록 없이 만든 입력이었다
    const legacy = step.from === 'idea' ? (idea ? ideaSource(idea, decisions) : null) : bodyOf(step.from);
    const changes = changesOf(step.key, doc, ctx, legacy);
    const generatedAt = isoOf(doc.data.generatedAt);
    const editedAt = isoOf(doc.data.editedAt);
    const draftAt = isoOf(draft.data.generatedAt);
    const d: DocDraft | null = doc.body !== null && draft.body !== null ? { content: draft.body, generatedAt: draftAt ?? '' } : null;
    return { ...step, content: doc.body, stale: changes.length > 0, changes, generatedAt, editedAt, draft: d, versions: versions[step.key] };
  });
}

type DocMeta = { sourceHash: string; inputs?: Record<string, string> };
const frontOf = (meta: DocMeta) => ({
  generatedAt: new Date().toISOString(),
  sourceHash: meta.sourceHash,
  ...(meta.inputs ? { inputs: meta.inputs } : {}),
  version: DOC_FILE_VERSION,
});

export async function saveDoc(id: string, key: DocKey, body: string, meta: DocMeta) {
  assertValidId(id);
  await keepOld(id, key);
  await fs.writeFile(docPath(id, key), withFront(frontOf(meta), body));
}

/** 이미 있는 문서를 다시 만들면 지금 판을 덮지 않고 초안으로 둔다. 앞 초안은 이전 버전 폴더로 (spec §2) */
export async function saveDraft(id: string, key: DocKey, body: string, meta: DocMeta) {
  assertValidId(id);
  assertKey(key);
  await keepHistory(id, draftPath(id, key), `${key}-draft`);
  await fs.mkdir(path.dirname(draftPath(id, key)), { recursive: true });
  await fs.writeFile(draftPath(id, key), withFront(frontOf(meta), body));
}

/** 초안을 지금 판으로. body를 주면 고쳐서 적용 (손으로 고친 표시). 지금 판 · 초안 파일은 이전 버전 폴더로 옮긴다 */
export async function applyDraft(id: string, key: DocKey, body?: string) {
  assertValidId(id);
  assertKey(key);
  const draft = await readParsed(draftPath(id, key));
  if (draft.body === null) throw new StorageError('적용할 새 판이 없어요. 새로고침해 주세요.');
  const edited = body !== undefined && body.trim() !== draft.body;
  const front = { ...draft.data, ...(edited ? { editedAt: new Date().toISOString() } : {}) };
  // 새 본문을 먼저 옆에 써 두고 옮긴다: 쓰기가 실패하면 지금 판 · 초안 모두 그대로
  const tmp = `${docPath(id, key)}.applying`;
  await fs.writeFile(tmp, withFront(front, edited ? body! : draft.body));
  await keepOld(id, key);
  await fs.rename(tmp, docPath(id, key));
  await keepHistory(id, draftPath(id, key), `${key}-draft`);
}

/** 지금 판 유지: 초안은 지우지 않고 이전 버전 폴더로 옮긴다 */
export async function keepCurrent(id: string, key: DocKey) {
  assertValidId(id);
  assertKey(key);
  await keepHistory(id, draftPath(id, key), `${key}-draft`);
}

/** 이전 버전 본문. 이름은 목록(listVersions)에 나온 모양만 받는다 (경로 조작 방지) */
export async function readVersion(id: string, key: DocKey, name: string): Promise<string> {
  assertValidId(id);
  assertKey(key);
  if (!versionName(key).test(name)) throw new StorageError('이전 버전을 찾을 수 없어요.');
  const v = await readParsed(path.join(ideaDir(id), HISTORY_DIR, name));
  if (v.body === null) throw new StorageError('이전 버전을 찾을 수 없어요.');
  return v.body;
}

/** 손으로 고친 본문. 만든 때의 입력 기록은 그대로 두고 고친 시각만 남긴다 */
export async function updateDocBody(id: string, key: DocKey, body: string) {
  assertValidId(id);
  const raw = await readRaw(id, key);
  if (raw === null) throw new StorageError('문서를 찾을 수 없어요. 먼저 만들어 주세요.');
  let data: Record<string, unknown> = {};
  try {
    data = matter(raw).data;
  } catch {
    // 깨진 머리말은 버리고 본문만 새로 쓴다 (이전 판은 .history에 남음)
  }
  await keepOld(id, key);
  await fs.writeFile(docPath(id, key), withFront({ ...data, editedAt: new Date().toISOString() }, body));
}

const runningFile = (id: string) => path.join(ideaDir(id), '.running.json');

export async function getRunning(id: string): Promise<{ key: DocKey; startedAt: string } | null> {
  assertValidId(id);
  const raw = await fs.readFile(runningFile(id), 'utf8').catch(() => null);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    if (!DOC_STEPS.some((s) => s.key === r?.key)) return null;
    const started = Date.parse(r.startedAt);
    if (!Number.isFinite(started) || Date.now() - started > RUNNING_TTL_MS) return null;
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
