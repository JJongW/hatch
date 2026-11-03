'use client';

import { useActionState, useState } from 'react';
import { Button, FlexBox, SectionMessage, TextArea, TextField, Typography } from '@montage-ui/core';

import { EVIDENCE_SOURCES, type Evidence, type EvidenceInput, type EvidenceSource } from '@/lib/storage/types';
import type { EvidenceState } from '../../actions';

type Props = {
  /** 확인 질문에 답할 때 그 질문 (고정). 없으면 질문 없는 근거 */
  question?: string;
  /** 고칠 때 처음 값 */
  initial?: Evidence;
  /** 처음 고른 출처 (고객 질문 → 인터뷰, 담당자 질문 → 담당자 확인) */
  defaultSource?: EvidenceSource;
  action: (prev: EvidenceState, formData: FormData) => Promise<EvidenceState>;
  /** 저장에 성공하면 저장한 근거 id와 함께 부른다 */
  onSaved: (evidenceId: string) => void;
  onClose: () => void;
  disabled: boolean;
};

// 근거 = 들은 것 · 본 것. 결정(고른 답 · 이유)과 칸을 섞지 않는다 (spec 2026-11-03 §1)
export default function EvidenceForm({ question, initial, defaultSource, action, onSaved, onClose, disabled }: Props) {
  const save = async (prev: EvidenceState, fd: FormData) => {
    const next = await action(prev, fd);
    if (!next.error && next.savedId) onSaved(next.savedId);
    return next;
  };
  const [state, formAction, pending] = useActionState(save, {});
  const v: Partial<EvidenceInput> = state.values ?? initial ?? {};
  const [source, setSource] = useState<EvidenceSource>(v.source ?? defaultSource ?? 'interview');

  return (
    <form action={formAction}>
      <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: '8px' }}>
        <input type="hidden" name="question" value={question ?? initial?.question ?? ''} />
        <input type="hidden" name="source" value={source} />
        <TextArea
          name="text"
          placeholder="들은 것 · 본 것을 그대로 (예: 퇴근길 지하철에서 앱을 연다고 했어요)"
          defaultValue={v.text}
          minRows={2}
          width="100%"
          aria-label="확인한 내용"
        />
        <FlexBox gap="8px" role="group" aria-label="어디서 확인했나요" sx={{ flexWrap: 'wrap' }}>
          {EVIDENCE_SOURCES.map((s) => (
            <Button
              key={s.key}
              type="button"
              size="small"
              variant={source === s.key ? 'solid' : 'outlined'}
              color={source === s.key ? 'primary' : 'assistive'}
              aria-pressed={source === s.key}
              onClick={() => setSource(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </FlexBox>
        <TextField name="sourceNote" placeholder="누구에게 · 언제 (선택, 예: 고객 A, 11/2 인터뷰)" defaultValue={v.sourceNote} aria-label="출처 메모" />
        <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
          근거로 저장해요. 결정 수와 기획안의 정한 것은 바뀌지 않아요.
        </Typography>
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
        <FlexBox justifyContent="flex-end" gap="8px">
          <Button size="small" variant="outlined" color="assistive" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" size="small" loading={pending} disabled={disabled}>
            근거 저장
          </Button>
        </FlexBox>
      </FlexBox>
    </form>
  );
}
