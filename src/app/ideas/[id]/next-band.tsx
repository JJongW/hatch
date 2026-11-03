'use client';

import Link from 'next/link';
import { Box, Button, FlexBox, Typography } from '@montage-ui/core';

import Panel from '@/components/panel';

import { changeSentence } from './doc-changes';

import type { Doc, DocKey } from '@/lib/storage';
import type { NextAction } from '@/lib/summary';

export type ToolLink = 'voc' | 'prd-review';

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

type Step = { text: string; open?: { doc: DocKey; label: string }; go?: { tool: ToolLink; label: string }; questions?: string; context?: string };

function stepOf(next: NextAction, label: (key: DocKey) => string, docOf: (key: DocKey) => Doc | undefined): Step {
  switch (next.kind) {
    case 'wait':
      return { text: `${label(next.doc)} 만드는 중이에요.` };
    case 'check-stale': {
      // 실제로 바뀐 입력으로 말한다 (원인을 모르는 예전 문서는 '입력이 바뀌었어요')
      const d = docOf(next.doc);
      if (d?.draft) return { text: `${label(next.doc)} 새 판이 있어요. 지금 판과 비교해 고르세요.`, open: { doc: next.doc, label: '새 판 비교하기' } };
      const why = d?.changes.length ? changeSentence(d, d.changes[0]) : '만든 뒤 입력이 바뀌었어요';
      // 근거 때문이면 버튼도 그렇게 (spec 2026-11-03 §6)
      const button = d?.changes.includes('evidence') ? `근거를 보고 ${label(next.doc)} 검토하기` : `${label(next.doc)} 검토하기`;
      return { text: `${label(next.doc)}: ${why}. 검토해 보세요.`, open: { doc: next.doc, label: button } };
    }
    case 'make-doc':
      return { text: `다음으로 만들 문서는 ${label(next.doc)}예요.`, open: { doc: next.doc, label: `${label(next.doc)} 열기` } };
    case 'make-questions':
      return { text: '문서에 [확인 필요]가 남았어요. 누구에게 물을지 질문으로 정리해요.', questions: '확인 질문 열기' };
    case 'collect-voc':
      return { text: '모르는 것이 남았는데 고객 근거가 없어요. 고객 의견부터 모아 봐요.', go: { tool: 'voc', label: '고객 의견 정리하기' } };
    case 'review-prd':
      return { text: 'PRD를 아직 리뷰받지 않았어요.', go: { tool: 'prd-review', label: 'PRD 리뷰 받기' } };
    case 'write-context':
      return { text: '대상 고객과 목표를 적어요. 모든 문서와 도구에 같이 들어가요.', context: '맥락 적기' };
    case 'decide':
      return { text: '질문에 답하거나 결정을 남겨요. 정한 것은 기획안을 다시 만들 때 들어가요.', questions: '확인 질문 열기' };
    case 'done':
      return { text: '문서가 모두 있어요. 바뀐 게 생기면 여기서 알려 줘요.' };
  }
}

/** "그다음: …" 짧은 이름 */
export function thenLabel(next: NextAction, label: (key: DocKey) => string): string | null {
  switch (next.kind) {
    case 'wait':
      return `${label(next.doc)} 만드는 중`;
    case 'check-stale':
      return `${label(next.doc)} 검토하기`;
    case 'make-doc':
      return `${label(next.doc)} 만들기`;
    case 'make-questions':
      return '확인 질문 정리하기';
    case 'collect-voc':
      return '고객 의견 정리하기';
    case 'review-prd':
      return 'PRD 리뷰 받기';
    case 'write-context':
      return '맥락 적기';
    case 'decide':
      return '결정 남기기';
    case 'done':
      return null;
  }
}

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
