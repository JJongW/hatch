'use client';

import { useActionState, useState } from 'react';
import { Button, FlexBox, SectionMessage, TextArea, TextField, Typography } from '@montage-ui/core';

import type { Decision, DecisionInput } from '@/lib/storage';
import type { DecisionState } from '../../actions';

type Props = {
  /** 질문에 답할 때: 질문은 고정 (출처는 `from`) */
  question?: string;
  /** 질문을 고정할 때의 출처 (기본: 기획안 질문) */
  from?: 'plan' | 'question';
  /** 수정할 때 처음 값 */
  initial?: Decision;
  /** 이 결정의 근거 (근거를 적은 뒤 바로 결정을 적을 때). 수정할 땐 initial의 연결을 그대로 쓴다 */
  evidenceIds?: string[];
  /** 질문을 고칠 수 있을 때 처음 채울 문장 (근거에서 바로 적을 때 그 질문) */
  defaultQuestion?: string;
  /** 처음 고른 상태. 근거에서 바로 적을 땐 '제안'이 맞을 때가 많다 */
  defaultStatus?: Decision['status'];
  action: (prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  onClose: () => void;
  disabled: boolean;
};

const STATUS_LABEL: Record<Decision['status'], string> = { proposed: '제안', decided: '정함', deferred: '보류' };

export default function DecisionForm({ question, from: fromProp, initial, evidenceIds, defaultQuestion, defaultStatus, action, onClose, disabled }: Props) {
  // 저장에 성공하면 닫는다
  const save = async (prev: DecisionState, fd: FormData) => {
    const next = await action(prev, fd);
    if (!next.error) onClose();
    return next;
  };
  const [state, formAction, pending] = useActionState(save, {});
  const v: Partial<DecisionInput> = state.values ?? initial ?? {};
  const [status, setStatus] = useState<Decision['status']>(v.status ?? defaultStatus ?? 'decided');
  const links = evidenceIds ?? initial?.evidenceIds ?? [];
  const fixed = question ?? (initial && initial.from !== 'manual' ? initial.question : undefined);
  const from = question ? (fromProp ?? 'plan') : (initial?.from ?? 'manual');

  return (
    <form action={formAction}>
      <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: '8px' }}>
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="status" value={status} />
        {links.map((e) => (
          <input key={e} type="hidden" name="evidenceIds" value={e} />
        ))}
        {fixed !== undefined ? (
          <input type="hidden" name="question" value={fixed} />
        ) : (
          <TextField name="question" placeholder="정할 것 (예: 첫 출시 지역)" defaultValue={v.question ?? defaultQuestion} aria-label="정할 것" />
        )}
        <FlexBox gap="8px" role="group" aria-label="제안, 정함 또는 보류">
          {(['proposed', 'decided', 'deferred'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="small"
              variant={status === s ? 'solid' : 'outlined'}
              color={status === s ? 'primary' : 'assistive'}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </FlexBox>
        {status !== 'deferred' && (
          <TextField
            name="answer"
            placeholder={status === 'proposed' ? '제안하는 답 (팀이 확정하기 전)' : '고른 답'}
            defaultValue={v.answer}
            aria-label={status === 'proposed' ? '제안하는 답' : '고른 답'}
          />
        )}
        <TextArea
          name="reason"
          placeholder={
            status === 'decided' ? '왜 이렇게 정했나요?' : status === 'proposed' ? '왜 이렇게 제안하나요? 누가 확정하나요?' : '왜 미루나요? 무엇을 알면 정할 수 있나요?'
          }
          defaultValue={v.reason}
          minRows={2}
          width="100%"
          aria-label="이유"
        />
        {links.length > 0 && (
          <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
            근거 {links.length}개와 연결해요.
          </Typography>
        )}
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
