'use client';

import { Fragment, useActionState, useState } from 'react';
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
  /** 밖에서 여닫기 ("다음 할 일"의 맥락 적기). 없으면 안에서만 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

/** 머리 아래 맥락 줄 (spec detail-dashboard §2-1). 이름과 값을 한 줄씩, 수정은 끝에 글자 버튼 */
export default function ContextPanel({ context, fields, action, disabled, open, onOpenChange }: Props) {
  const demo = useDemo();
  const [inner, setInner] = useState(false);
  const editing = open ?? inner;
  const setEditing = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInner(v));
  const filled = fields.filter((f) => context[f.key]);

  if (editing) {
    return <ContextForm context={context} fields={fields} action={action} disabled={disabled} onClose={() => setEditing(false)} />;
  }

  if (filled.length === 0) {
    if (demo) return null;
    return (
      <FlexBox alignItems="center" gap="8px" sx={{ flexWrap: 'wrap' }}>
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">
          목표 고객, 목표 지표를 적어 두면 모든 문서와 도구에 같이 들어가요.
        </Typography>
        <TextButton size="small" onClick={() => setEditing(true)} disabled={disabled}>
          맥락 적기
        </TextButton>
      </FlexBox>
    );
  }

  return (
    <Box as="dl" aria-label="프로젝트 맥락" sx={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', columnGap: '12px', rowGap: '4px', margin: 0 }}>
      {filled.map((f) => (
        <Fragment key={f.key}>
          <Typography as="dt" variant="label1" color="semantic.foreground.neutral.secondary">
            {f.label}
          </Typography>
          <Typography as="dd" variant="label1" sx={{ margin: 0 }}>
            {context[f.key]}
          </Typography>
        </Fragment>
      ))}
      {!demo && (
        <Box sx={{ gridColumn: '1 / -1' }}>
          <TextButton size="small" color="assistive" onClick={() => setEditing(true)} disabled={disabled}>
            맥락 수정
          </TextButton>
        </Box>
      )}
    </Box>
  );
}
