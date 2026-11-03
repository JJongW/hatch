'use client';

import { useActionState, useState } from 'react';
import { Box, Button, FlexBox, SectionMessage, TextArea, Typography, type Theme } from '@montage-ui/core';

import DiffView, { formatWhen } from './diff-view';
import { changeSentence } from './doc-changes';

import type { Doc } from '@/lib/storage';
import type { DocActionState } from '../../actions';

type Props = {
  doc: Doc & { content: string; draft: NonNullable<Doc['draft']> };
  resolve: (prev: DocActionState, formData: FormData) => Promise<DocActionState>;
  disabled: boolean;
  /** 지금 판을 이전 버전으로 남기나 (체험은 저장이 없어 false) */
  keepsVersions: boolean;
};

// 다시 만든 판을 바로 덮지 않고, 비교한 뒤 적용 · 고쳐서 적용 · 지금 판 유지 중에 고른다 (spec 2026-11-03 §2)
export default function DraftReview({ doc, resolve, disabled, keepsVersions }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(resolve, {});
  // 지금 판을 만든 뒤 바뀐 입력 (새 판은 이 변화를 보고 만들었다)
  const reasons = doc.changes.filter((c) => c !== 'unknown').map((c) => changeSentence(doc, c));
  const button = (mode: 'apply' | 'keep', label: string, solid = false) => (
    <Button type="submit" name="mode" value={mode} size="small" variant={solid ? 'solid' : 'outlined'} color={solid ? 'primary' : 'assistive'} disabled={disabled || pending}>
      {label}
    </Button>
  );
  return (
    <Box
      role="region"
      aria-label="다시 만든 판 비교"
      sx={(t: Theme) => ({ border: `1px solid ${t.semantic.line.neutral.primary}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' })}
    >
      <FlexBox flexDirection="column" gap="8px">
        <Typography variant="label1" weight="bold">
          다시 만든 판이 있어요 {doc.draft.generatedAt && `(${formatWhen(doc.draft.generatedAt)})`}
        </Typography>
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">
          아래 지금 판은 그대로예요. 비교해 보고 고르세요.
          {reasons.length > 0 && ` 지금 판을 만든 뒤 바뀐 것: ${reasons.join(', ')}.`}
        </Typography>
        {doc.editedAt && (
          <SectionMessage variant="cautionary">
            {keepsVersions
              ? '지금 판에 직접 고친 내용이 있어요. 적용하면 고친 내용은 이전 버전으로 가요. 남기려면 고쳐서 적용에서 옮겨 적어 주세요.'
              : '지금 판에 직접 고친 내용이 있어요. 체험에서는 적용하면 고친 내용이 사라져요. 남기려면 고쳐서 적용에서 옮겨 적어 주세요.'}
          </SectionMessage>
        )}
        <DiffView before={doc.content} after={doc.draft.content} />
        {editing ? (
          <form action={action}>
            <input type="hidden" name="mode" value="edit" />
            <FlexBox flexDirection="column" gap="8px">
              <TextArea name="body" defaultValue={doc.draft.content} minRows={10} width="100%" aria-label={`${doc.label} 새 판 고치기`} />
              <FlexBox justifyContent="flex-end" gap="8px">
                <Button type="button" size="small" variant="outlined" color="assistive" onClick={() => setEditing(false)}>
                  취소
                </Button>
                <Button type="submit" size="small" loading={pending} disabled={disabled}>
                  고친 판 적용
                </Button>
              </FlexBox>
            </FlexBox>
          </form>
        ) : (
          <form action={action}>
            <FlexBox justifyContent="flex-end" gap="8px" sx={{ flexWrap: 'wrap' }}>
              {button('keep', '지금 판 유지')}
              <Button type="button" size="small" variant="outlined" color="assistive" onClick={() => setEditing(true)} disabled={disabled || pending}>
                고쳐서 적용
              </Button>
              {button('apply', '새 판 적용', true)}
            </FlexBox>
          </form>
        )}
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
      </FlexBox>
    </Box>
  );
}
