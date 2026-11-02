'use client';

import { useActionState, useState } from 'react';
import { Box, Button, FlexBox, SectionMessage, TextArea, TextButton, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import SectionTitle from '../../_components/section-title';

import type { IdeaContext } from '@/lib/storage';
import type { ContextState } from '../../actions';

type Props = {
  context: IdeaContext;
  /** 칸 순서 · 이름 (storage의 CONTEXT_FIELDS를 페이지가 넘긴다) */
  fields: ReadonlyArray<{ key: keyof IdeaContext; label: string }>;
  action: (prev: ContextState, formData: FormData) => Promise<ContextState>;
  /** 문서 생성 중이면 저장을 막는다 */
  disabled: boolean;
};

const PLACEHOLDER: Record<keyof IdeaContext, string> = {
  customer: '누구의 문제를 푸나요?',
  goal: '무엇이 움직이면 성공인가요?',
  constraints: '일정, 인력, 정책처럼 넘으면 안 되는 선',
  facts: '조사나 데이터로 확인한 것',
};

/** 수정 중에만 마운트된다 — 열 때마다 useActionState가 새로 시작해 저장본 · 빈 오류로 돌아온다 */
function ContextForm({ context, fields, action, disabled, onClose }: Props & { onClose: () => void }) {
  // 저장에 성공하면 읽기로 돌아간다
  const save = async (prev: ContextState, fd: FormData) => {
    const next = await action(prev, fd);
    if (!next.error) onClose();
    return next;
  };
  const [state, formAction, pending] = useActionState(save, {});
  const values = state.values ?? context;
  return (
    <Box>
      <SectionTitle>프로젝트 맥락</SectionTitle>
      <form action={formAction}>
        <FlexBox flexDirection="column" gap="12px">
          {fields.map((f) => (
            <FlexBox key={f.key} flexDirection="column" gap="4px">
              <Typography as="label" htmlFor={`ctx-${f.key}`} variant="label1" weight="bold">
                {f.label}
              </Typography>
              <TextArea id={`ctx-${f.key}`} name={f.key} defaultValue={values[f.key]} placeholder={PLACEHOLDER[f.key]} minRows={2} width="100%" />
            </FlexBox>
          ))}
          {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
          <FlexBox justifyContent="flex-end" gap="8px">
            <Button size="small" variant="outlined" color="assistive" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button type="submit" size="small" loading={pending} disabled={disabled}>
              맥락 저장
            </Button>
          </FlexBox>
        </FlexBox>
      </form>
    </Box>
  );
}

export default function ContextPanel({ context, fields, action, disabled }: Props) {
  const demo = useDemo();
  const [editing, setEditing] = useState(false);
  const filled = fields.filter((f) => context[f.key]);

  if (editing) {
    return <ContextForm context={context} fields={fields} action={action} disabled={disabled} onClose={() => setEditing(false)} />;
  }

  return (
    <Box>
      <SectionTitle
        trailing={
          !demo &&
          filled.length > 0 && (
            <TextButton size="small" color="assistive" onClick={() => setEditing(true)} disabled={disabled}>
              수정
            </TextButton>
          )
        }
      >
        프로젝트 맥락
      </SectionTitle>
      {filled.length > 0 ? (
        <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
          {filled.map((f) => (
            <li key={f.key}>
              {f.label}: {context[f.key]}
            </li>
          ))}
        </Typography>
      ) : (
        <FlexBox flexDirection="column" gap="8px" alignItems="flex-start">
          <Typography as="p" variant="body2" color="semantic.foreground.neutral.secondary">
            {demo ? '아직 적은 맥락이 없어요.' : '적어 두면 모든 문서와 도구에 같이 들어가요.'}
          </Typography>
          {!demo && (
            <Button size="small" onClick={() => setEditing(true)} disabled={disabled}>
              맥락 적기
            </Button>
          )}
        </FlexBox>
      )}
    </Box>
  );
}
