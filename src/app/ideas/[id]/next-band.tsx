'use client';

import Link from 'next/link';
import { Box, Button, FlexBox, Typography } from '@montage-ui/core';

import Panel from '@/components/panel';

import { stepOf, thenLabel, type ToolLink } from './next-step';

import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction } from '@/lib/summary';

type Props = {
  next: NextAction;
  /** 그다음 하나. 있으면 "그다음: …" 한 줄 */
  then?: NextAction | null;
  /** 맥락 적기 (체험 과제) */
  onOpenContext?: () => void;
  docs: Doc[];
  ideaId: string;
  onOpenDoc: (key: DocKey) => void;
  onOpenQuestions: () => void;
  /** 있으면 도구 버튼이 주소 이동 대신 이 함수를 부른다 (흐름 체험) */
  goTool?: (tool: ToolLink) => void;
};

/** 머리 바로 아래 "다음 할 일" 한 줄 + 주 버튼 하나 (spec detail-dashboard §2-2) */
export default function NextBand({ next, then, onOpenContext, docs, ideaId, onOpenDoc, onOpenQuestions, goTool }: Props) {
  const label = (key: DocKey) => docs.find((d) => d.key === key)?.label ?? key;
  const step = stepOf(next, label, (key) => docs.find((d) => d.key === key));
  const after = then ? thenLabel(then, label) : null;
  return (
    <Box as="section" aria-label="다음 할 일">
      <Panel>
        <FlexBox justifyContent="space-between" alignItems="center" gap="12px" sx={{ flexWrap: 'wrap' }}>
          <FlexBox flexDirection="column" gap="2px" sx={{ minWidth: 0, flex: '1 1 240px' }}>
            <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.secondary">
              다음 할 일
            </Typography>
            <Typography variant="body1" weight="medium">
              {step.text}
            </Typography>
            {after && (
              <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
                그다음: {after}
              </Typography>
            )}
          </FlexBox>
          {step.context && onOpenContext && (
            <Button size="medium" onClick={onOpenContext}>
              {step.context}
            </Button>
          )}
          {step.open && (
            <Button size="medium" onClick={() => onOpenDoc(step.open!.doc)}>
              {step.open.label}
            </Button>
          )}
          {step.questions && (
            <Button size="medium" onClick={onOpenQuestions}>
              {step.questions}
            </Button>
          )}
          {step.go &&
            (goTool ? (
              <Button size="medium" onClick={() => goTool(step.go!.tool)}>
                {step.go.label}
              </Button>
            ) : (
              <Button as={Link} href={`/tools/${step.go.tool}?idea=${ideaId}`} size="medium">
                {step.go.label}
              </Button>
            ))}
        </FlexBox>
      </Panel>
    </Box>
  );
}
