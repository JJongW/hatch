'use client';

import { useActionState, useState } from 'react';
import { Button, Chip, FlexBox, SectionMessage, TextArea, TextField, Typography } from '@montage-ui/core';

import type { FormState } from '../actions';

import { UseLocallyButton, useDemo } from './demo';

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  initial?: { title: string; memo: string; folder: string };
  /** 저장 후 입력을 비울지 (쓰기 화면) */
  resetOnSave?: boolean;
  /** 다른 긴 작업 중 제출을 막는다 */
  disabled?: boolean;
  /** 지금 있는 폴더 이름 (누르면 칸이 채워진다) */
  folders: string[];
};

// 칩을 누르면 칸이 채워져야 해서 상태가 필요하다. form 안에 두어 key가 바뀔 때 같이 다시 그려진다
function FolderField({ initial, folders, disabled }: { initial: string; folders: string[]; disabled: boolean }) {
  const [folder, setFolder] = useState(initial);
  return (
    <FlexBox flexDirection="column" gap="8px">
      <TextField
        name="folder"
        placeholder="폴더 (선택, 비우면 미분류)"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
        aria-label="폴더"
        disabled={disabled}
      />
      {folders.length > 0 && !disabled && (
        <FlexBox gap="6px" sx={{ flexWrap: 'wrap' }}>
          {folders.map((name) => (
            <Chip key={name} type="button" size="small" variant="outlined" active={folder === name} onClick={() => setFolder(name)}>
              {name}
            </Chip>
          ))}
        </FlexBox>
      )}
    </FlexBox>
  );
}

export default function IdeaForm({ action, submitLabel, initial, resetOnSave = false, disabled = false, folders }: Props) {
  const demo = useDemo();
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
          autoFocus={resetOnSave && !demo}
          disabled={demo}
        />
        <TextArea name="memo" placeholder="메모 (선택)" defaultValue={values?.memo} minRows={3} width="100%" aria-label="메모" disabled={demo} />
        <FolderField initial={values?.folder ?? ''} folders={folders} disabled={demo} />
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
        {!state.error && state.savedAt && !resetOnSave && (
          <Typography variant="caption1" color="semantic.foreground.positive.primary">
            저장했어요.
          </Typography>
        )}
        <FlexBox justifyContent="flex-end">
          {demo ? (
            <UseLocallyButton />
          ) : (
            <Button type="submit" loading={pending} disabled={disabled}>
              {submitLabel}
            </Button>
          )}
        </FlexBox>
      </FlexBox>
    </form>
  );
}
