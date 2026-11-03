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
  /** 새 판에 새로 들어간 결정 · 근거 (freshInputs) */
  fresh?: { decisions: string[]; evidence: string[] };
};

// 다시 만든 판을 바로 덮지 않고, 비교한 뒤 적용 · 고쳐서 적용 · 지금 판 유지 중에 고른다 (spec 2026-11-03 §2)
export default function DraftReview({ doc, resolve, disabled, keepsVersions, fresh }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(resolve, {});
  // 지금 판을 만든 뒤 바뀐 입력 (새 판은 이 변화를 보고 만들었다)
  const reasons = doc.changes.filter((c) => c !== 'unknown').map((c) => changeSentence(doc, c));
  // 새 판을 만든 뒤에도 바뀐 입력 → 적용해도 그 변화는 빠져 있다
  // 문장은 새 판 기준: 지금 판의 "빠졌던 문서" 표시를 넘기지 않는다 (새 판은 그 문서로 만들었을 수 있다)
  const later = doc.draft.changes.filter((c) => c !== 'unknown').map((c) => changeSentence({ from: doc.from }, c));
  const freshGroups = [
    { title: '결정', items: fresh?.decisions ?? [] },
    { title: '근거', items: fresh?.evidence ?? [] },
  ].filter((g) => g.items.length > 0);
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
        {freshGroups.length > 0 && (
          <Box>
            <Typography variant="label2" weight="bold" sx={{ display: 'block', marginBottom: '4px' }}>
              새 판에 들어간, 새로 생기거나 고친 것
            </Typography>
            {freshGroups.map((g) => (
              <Box key={g.title} sx={{ marginBottom: '4px' }}>
                <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
                  {g.title} {g.items.length}개
                </Typography>
                <Box as="ul" sx={{ margin: 0, paddingLeft: '20px' }}>
                  {g.items.map((t, i) => (
                    <Typography key={i} as="li" variant="body2">
                      {t}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {later.length > 0 && (
          <SectionMessage variant="cautionary">
            새 판을 만든 뒤에도 {later.join(', ')}. 적용해도 이 변화는 들어 있지 않아요. 아래 &apos;새 판 다시 만들기&apos;를 누르면 반영돼요.
          </SectionMessage>
        )}
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
