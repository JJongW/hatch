'use client';

import { useActionState, useState } from 'react';
import { Box, Button, FlexBox, SectionMessage, Typography } from '@montage-ui/core';

import Panel from '@/components/panel';

import type { ShareActionState, ShareOp } from '../../actions';
import { useConfirmSubmit } from '../../_components/use-confirm-submit';

export type ShareInfo = {
  /** 공유 중이면 링크와 마지막으로 올린 때(서버에서 포맷), 아니면 null */
  active: { link: string; publishedAt: string } | null;
  /** 지금 올리면 나가는 개수 (spec §3-3, 올리기 전 PO 확인) */
  counts: { docs: number; questions: number; decisions: number };
};

type Props = ShareInfo & { action: (op: ShareOp) => Promise<ShareActionState>; disabled: boolean; onClose: () => void };

/** 상세 머리 아래 공유 칸. 버튼을 누를 때만 밖으로 올린다 (맥에서 고쳐도 저절로 안 올라감) */
export default function SharePanel({ active, counts, action, disabled, onClose }: Props) {
  const [state, formAction, pending] = useActionState<ShareActionState, FormData>(
    (_prev, fd) => action(String(fd.get('op')) as ShareOp),
    {},
  );
  const [copied, setCopied] = useState(false);
  const ask = useConfirmSubmit();
  const confirmOff = ask({ title: '공유를 끌까요?', content: '이 링크는 바로 "공유가 끝난 링크"가 되고, 다시 켤 수 없어요. 원본은 맥에 그대로 있어요.', confirm: '공유 끄기', negative: true });
  const confirmNew = ask({ title: '새 링크를 만들까요?', content: '지금 링크는 바로 끝나요. 새 링크를 다시 보내야 해요.', confirm: '새 링크' });
  const off = disabled || pending;
  const what = `문서 ${counts.docs}개, 확인 질문 ${counts.questions}개, 결정 ${counts.decisions}개`;

  const op = (value: ShareOp, label: string, opts: { primary?: boolean; confirm?: ReturnType<typeof ask> } = {}) => (
    <form action={formAction} onSubmit={opts.confirm}>
      <input type="hidden" name="op" value={value} />
      <Button type="submit" size="small" variant={opts.primary ? 'solid' : 'outlined'} color={opts.primary ? 'primary' : 'assistive'} disabled={off} loading={pending && opts.primary}>
        {label}
      </Button>
    </form>
  );

  const copy = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Panel>
      <FlexBox flexDirection="column" gap="12px">
        {active ? (
          <>
            <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.secondary">
              공유 중
            </Typography>
            <FlexBox alignItems="center" gap="8px" sx={{ flexWrap: 'wrap' }}>
              <Box as="code" sx={{ fontSize: '14px', wordBreak: 'break-all', flex: '1 1 320px' }}>
                {active.link}
              </Box>
              <Button size="small" variant="outlined" color="assistive" onClick={copy}>
                {copied ? '복사했어요' : '링크 복사'}
              </Button>
            </FlexBox>
            <Typography variant="label1" color="semantic.foreground.neutral.secondary">
              {`${active.publishedAt}에 올린 사본이에요. 맥에서 고친 내용은 '공유 새로고침'을 눌러야 보여요. 지금 누르면 ${what}가 올라가요.`}
            </Typography>
            <FlexBox gap="8px" sx={{ flexWrap: 'wrap' }}>
              {op('refresh', '공유 새로고침', { primary: true })}
              {op('new', '새 링크', { confirm: confirmNew })}
              {op('off', '공유 끄기', { confirm: confirmOff })}
            </FlexBox>
          </>
        ) : (
          <>
            <Typography variant="body1" weight="medium">
              {`${what}를 읽기 전용 링크로 공유해요.`}
            </Typography>
            <Typography variant="label1" color="semantic.foreground.neutral.secondary">
              링크가 있는 사람은 누구나 볼 수 있어요. 이전 판, 사용량, 도구 결과, 폴더는 올라가지 않아요.
            </Typography>
            <FlexBox gap="8px">
              {op('publish', '공유하기', { primary: true })}
              <Button size="small" variant="outlined" color="assistive" onClick={onClose} disabled={pending}>
                취소
              </Button>
            </FlexBox>
          </>
        )}
        {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
      </FlexBox>
    </Panel>
  );
}
