'use client';

import { useActionState, useState } from 'react';
import { Button, FlexBox, SectionMessage, TextArea, TextField } from '@montage-ui/core';

import type { Decision, DecisionInput } from '@/lib/storage';
import type { DecisionState } from '../../actions';

type Props = {
  /** 질문에 답할 때: 질문은 고정 (출처는 `from`) */
  question?: string;
  /** 질문을 고정할 때의 출처 (기본: 기획안 질문) */
  from?: 'plan' | 'question';
  /** 수정할 때 처음 값 */
  initial?: Decision;
  action: (prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  onClose: () => void;
  disabled: boolean;
};

export default function DecisionForm({ question, from: fromProp, initial, action, onClose, disabled }: Props) {
  // 저장에 성공하면 닫는다
  const save = async (prev: DecisionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (!next.error) onClose();
    return next;
  };
  const [state, formAction, pending] = useActionState(save, {});
  const v: Partial<DecisionInput> = state.values ?? initial ?? {};
  const [status, setStatus] = useState<Decision['status']>(v.status ?? 'decided');
  const fixed = question ?? (initial && initial.from !== 'manual' ? initial.question : undefined);
  const from = question ? (fromProp ?? 'plan') : (initial?.from ?? 'manual');

  return (
    <form action={formAction}>
      <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: '8px' }}>
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="status" value={status} />
        {fixed !== undefined ? (
          <input type="hidden" name="question" value={fixed} />
        ) : (
          <TextField name="question" placeholder="정할 것 (예: 첫 출시 지역)" defaultValue={v.question} aria-label="정할 것" />
        )}
        <FlexBox gap="8px" role="group" aria-label="정함 또는 보류">
          {(['decided', 'deferred'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="small"
              variant={status === s ? 'solid' : 'outlined'}
              color={status === s ? 'primary' : 'assistive'}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s === 'decided' ? '정함' : '보류'}
            </Button>
          ))}
        </FlexBox>
        {status === 'decided' && <TextField name="answer" placeholder="고른 답" defaultValue={v.answer} aria-label="고른 답" />}
        <TextArea
          name="reason"
          placeholder={status === 'decided' ? '왜 이렇게 정했나요?' : '왜 미루나요? 무엇을 알면 정할 수 있나요?'}
          defaultValue={v.reason}
          minRows={2}
          width="100%"
          aria-label="이유"
        />
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
        <FlexBox justifyContent="flex-end" gap="8px">
          <Button size="small" variant="outlined" color="assistive" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="submit" size="small" loading={pending} disabled={disabled}>
            저장
          </Button>
        </FlexBox>
      </FlexBox>
    </form>
  );
}
