'use client';

import { useActionState } from 'react';
import { Button, FlexBox, SectionMessage, TextArea, TextField, Typography } from '@montage-ui/core';

import type { FormState } from '../actions';

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  initial?: { title: string; memo: string };
  /** 저장 후 입력을 비울지 (쓰기 화면) */
  resetOnSave?: boolean;
  /** 다른 긴 작업 중 제출을 막는다 */
  disabled?: boolean;
};

export default function IdeaForm({ action, submitLabel, initial, resetOnSave = false, disabled = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? (resetOnSave ? undefined : initial);

  return (
    // 저장할 때마다 key가 바뀌어 defaultValue를 다시 읽는다
    <form key={state.savedAt ?? 0} action={formAction}>
      <FlexBox flexDirection="column" gap="12px">
        <TextField
          name="title"
          placeholder="아이디어 한 줄 (Enter로 저장)"
          defaultValue={values?.title}
          status={state.error ? 'negative' : 'normal'}
          aria-label="아이디어 제목"
          autoFocus={resetOnSave}
        />
        <TextArea name="memo" placeholder="메모 (선택)" defaultValue={values?.memo} minRows={3} width="100%" aria-label="메모" />
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
        {!state.error && state.savedAt && !resetOnSave && (
          <Typography variant="caption1" color="semantic.foreground.positive.primary">
            저장했어요.
          </Typography>
        )}
        <FlexBox justifyContent="flex-end">
          <Button type="submit" loading={pending} disabled={disabled}>
            {submitLabel}
          </Button>
        </FlexBox>
      </FlexBox>
    </form>
  );
}
