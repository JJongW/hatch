import 'server-only';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

import { keepHistory } from './history';
import { getIdea, StorageError } from './ideas';
import { assertValidId } from './ids';
import { ideaDir, isMissing } from './paths';
import { EVIDENCE_FILE_VERSION, EVIDENCE_MAX, EVIDENCE_SOURCES, type Evidence, type EvidenceInput, type EvidenceSource } from './types';

// 근거(고객 · 담당자에게 확인한 것)는 결정과 다른 파일에 둔다 — 근거를 적어도 결정 수 · 기획안 입력이 바뀌지 않는다 (spec 2026-11-03 §1)
const file = (id: string) => path.join(ideaDir(id), 'evidence.md');
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v); // 손으로 고친 날짜는 YAML Date
const isSource = (v: unknown): v is EvidenceSource => EVIDENCE_SOURCES.some((s) => s.key === v);

function isEvidence(v: unknown): v is Evidence {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return ['id', 'text', 'sourceNote', 'question', 'collectedAt'].every((k) => typeof e[k] === 'string') && isSource(e.source);
}

/** 파일이 없거나 깨졌으면 빈 목록, 깨진 항목은 건너뛴다 */
export async function listEvidence(id: string): Promise<Evidence[]> {
  assertValidId(id);
  let raw: string;
  try {
    raw = await fs.readFile(file(id), 'utf8');
  } catch (e) {
    if (isMissing(e)) return [];
    throw e;
  }
  try {
    const items: unknown = matter(raw).data.items;
    if (!Array.isArray(items)) return [];
    return items
      .map((it) => (typeof it === 'object' && it ? { sourceNote: '', question: '', ...it, collectedAt: iso((it as Evidence).collectedAt) } : it))
      .filter(isEvidence);
  } catch {
    return [];
  }
}

function clean(input: EvidenceInput): EvidenceInput {
  const text = input.text.trim();
  const sourceNote = input.sourceNote.trim();
  if (!text) throw new StorageError('들은 내용을 적어 주세요.');
  if (!isSource(input.source)) throw new StorageError('어디서 확인했는지 골라 주세요.');
  if (text.length > EVIDENCE_MAX.text || sourceNote.length > EVIDENCE_MAX.sourceNote) {
    throw new StorageError(`내용은 ${EVIDENCE_MAX.text}자, 출처 메모는 ${EVIDENCE_MAX.sourceNote}자까지예요.`);
  }
  return { text, source: input.source, sourceNote, question: input.question.trim() };
}

/** evidenceId가 있으면 그 근거를 고친다 (id · 질문은 그대로). 이전 판은 .history/evidence-<시각>.md */
export async function saveEvidence(id: string, input: EvidenceInput, evidenceId?: string): Promise<Evidence> {
  if (!(await getIdea(id))) throw new StorageError('아이디어를 찾을 수 없어요. 이미 휴지통으로 옮겼을 수 있어요.');
  const c = clean(input);
  const items = await listEvidence(id);
  const collectedAt = new Date().toISOString();
  let saved: Evidence;
  if (evidenceId) {
    const i = items.findIndex((e) => e.id === evidenceId);
    if (i < 0) throw new StorageError('근거를 찾을 수 없어요. 새로고침해 주세요.');
    saved = { ...items[i], ...c, question: items[i].question, collectedAt };
    items[i] = saved;
  } else {
    let newId: string;
    do {
      newId = crypto.randomBytes(2).toString('hex');
    } while (items.some((e) => e.id === newId));
    saved = { id: newId, ...c, collectedAt };
    items.push(saved);
  }
  await keepHistory(id, file(id), 'evidence');
  await fs.writeFile(file(id), matter.stringify('', { version: EVIDENCE_FILE_VERSION, items }));
  return saved;
}
