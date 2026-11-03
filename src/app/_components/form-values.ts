// 결정 · 근거 폼 → 저장 입력. Server Action과 체험 화면(try-flow)이 같은 해석을 쓴다 (순수)
import type { DecisionInput, EvidenceInput } from '@/lib/storage/types';

const STATUSES = ['decided', 'deferred', 'proposed'] as const;

export function decisionValues(formData: FormData): DecisionInput {
  const get = (k: string) => String(formData.get(k) ?? '');
  const from = get('from');
  const evidenceIds = formData.getAll('evidenceIds').map(String).filter(Boolean);
  return {
    question: get('question'),
    status: STATUSES.find((s) => s === get('status')) ?? 'decided',
    answer: get('answer'),
    reason: get('reason'),
    from: from === 'plan' || from === 'question' ? from : 'manual',
    ...(evidenceIds.length ? { evidenceIds } : {}),
  };
}

/** source는 저장할 때 검사한다 (모르는 값이면 거절) */
export function evidenceValues(formData: FormData): EvidenceInput {
  const get = (k: string) => String(formData.get(k) ?? '');
  return { text: get('text'), source: get('source') as EvidenceInput['source'], sourceNote: get('sourceNote'), question: get('question') };
}
