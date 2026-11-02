'use client';

import { useActionState, useId, useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, SectionMessage, TextArea, TextButton, Typography } from '@montage-ui/core';

import { UseLocallyButton, useDemo } from '../../_components/demo';
import DocMarkdown from '../../_components/doc-markdown';
import RunningNote from '../../_components/running-note';
import { DOC_RUNNING_STEPS, formatElapsed } from '../../_components/running-steps';
import { useConfirmSubmit } from '../../_components/use-confirm-submit';

import type { Doc, DocKey } from '@/lib/storage';
import type { DocActionState } from '../../actions';

/** 생성 결과 + 걸린 시간(초). 성공했을 때만 tookSec이 있다 */
type GenState = DocActionState & { tookSec?: number };

type Props = {
  doc: Doc;
  /** 이 단계를 만들 수 있나 (GENERATABLE) */
  ready: boolean;
  /** 앞 문서(또는 아이디어)가 있나 */
  hasSource: boolean;
  /** 지금 생성 중인 문서 (서버 값 또는 이 화면에서 시작한 생성) */
  running: DocKey | null;
  /** 이 카드가 시작/끝날 때 알린다 — 다른 탭의 버튼을 막기 위해 */
  onBusy: (key: DocKey | null) => void;
  /** 질문 만들기처럼 다른 긴 작업 중이면 막는다 */
  locked: boolean;
  generate: (key: DocKey, prev: DocActionState) => Promise<DocActionState>;
  update: (key: DocKey, prev: DocActionState, formData: FormData) => Promise<DocActionState>;
};

export default function DocCard({ doc, ready, hasSource, running, onBusy, locked, generate, update }: Props) {
  const demo = useDemo();
  const [editing, setEditing] = useState(false);

  // 생성이 끝나면 걸린 시간을 결과에 같이 남겨, 대기 화면이 "N분 걸려 만들었어요" 한 줄로 접히게 한다
  // onBusy(key)는 제출 순간(generateForm onSubmit)에 부른다. 액션 안에서 부르면 액션이 끝날 때까지 반영되지 않아 탭과 다른 카드가 생성 중임을 모른다
  const [genState, genAction, genPending] = useActionState(async (prev: GenState): Promise<GenState> => {
    const started = Date.now();
    try {
      const next = await generate(doc.key, prev);
      return next.error ? next : { ...next, tookSec: Math.round((Date.now() - started) / 1000) };
    } finally {
      onBusy(null);
    }
  }, {});
  const [showSteps, setShowSteps] = useState(false);
  const stepsId = useId();
  const steps = DOC_RUNNING_STEPS[doc.key];

  const [saveState, saveAction, savePending] = useActionState(async (prev: DocActionState, fd: FormData) => {
    const next = await update(doc.key, prev, fd);
    if (!next.error) setEditing(false);
    return next;
  }, {});

  const busy = genPending || running === doc.key;
  const blocked = running !== null || genPending || locked; // 어떤 생성이든 진행 중이면 다른 버튼은 막는다
  const error = genState.error ?? saveState.error;

  const ask = useConfirmSubmit();
  const confirmRegenerate = ask({ title: '문서를 새로 만들까요?', content: '지금 문서는 .history에 남아요.', confirm: '새로 만들기' });

  const generateForm = (label: string, variant: 'solid' | 'outlined', onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void) => (
    <form
      action={genAction}
      onSubmit={(e) => {
        onSubmit?.(e);
        // 액션 밖에서 바로 알린다 (확인 창을 띄우는 첫 제출과 취소는 막혀 있어 알리지 않음). 끝날 때는 액션의 finally가 onBusy(null)
        if (!e.defaultPrevented) onBusy(doc.key);
      }}
    >
      <Button type="submit" size="small" variant={variant} color={variant === 'solid' ? 'primary' : 'assistive'} disabled={blocked}>
        {label}
      </Button>
    </form>
  );

  const disabledButton = (label: string) => (
    <Button size="small" variant="outlined" color="assistive" disabled>
      {label}
    </Button>
  );

  return (
    <Box>
      <FlexBox alignItems="center" gap="8px" sx={{ marginBottom: '8px' }}>
        <ContentBadge size="xsmall" variant="outlined" color={doc.content === null ? 'neutral' : 'accent'}>
          {doc.content === null ? '아직 없음' : doc.file}
        </ContentBadge>
        {doc.content !== null && doc.stale && (
          <ContentBadge size="xsmall" variant="solid" color="accent" accentColor="semantic.foreground.cautionary.primary">
            앞 문서가 바뀌었어요
          </ContentBadge>
        )}
      </FlexBox>

      {/* 이 화면에서 만든 문서: 대기 화면이 한 줄로 접힌다. 누르면 예상 순서를 펼친다 */}
      {!busy && genState.tookSec !== undefined && doc.content !== null && (
        <Box sx={{ marginBottom: '12px', '--hatch-rise': '4px', animation: 'hatch-rise 300ms ease-out both' }}>
          <TextButton
            size="small"
            color="assistive"
            aria-expanded={showSteps}
            aria-controls={stepsId}
            onClick={() => setShowSteps((v) => !v)}
          >
            <span aria-hidden>{showSteps ? '▾ ' : '▸ '}</span>
            {`${formatElapsed(genState.tookSec)} 걸려 만들었어요`}
          </TextButton>
          {showSteps && (
            <Box id={stepsId} sx={{ marginTop: '6px' }}>
              <Box as="ol" sx={{ margin: 0, paddingLeft: '20px' }}>
                {steps.map((s) => (
                  <Typography key={s} as="li" variant="caption1" color="semantic.foreground.neutral.secondary">
                    {s}
                  </Typography>
                ))}
              </Box>
              <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
                예상 순서예요. 실제 진행과 다를 수 있어요.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {busy ? (
        <RunningNote label="만드는 중이에요. 1~2분 걸려요." steps={steps} />
      ) : doc.content === null ? (
        demo ? (
          <UseLocallyButton size="small" />
        ) : !ready ? (
          disabledButton('준비 중')
        ) : !hasSource ? (
          disabledButton('앞 문서 먼저')
        ) : (
          generateForm(`${doc.label} 만들기`, 'solid')
        )
      ) : editing ? (
        <form action={saveAction}>
          <FlexBox flexDirection="column" gap="8px">
            <TextArea name="body" defaultValue={doc.content} minRows={12} width="100%" aria-label={`${doc.label} 본문`} />
            <FlexBox justifyContent="flex-end" gap="8px">
              <Button type="button" size="small" variant="outlined" color="assistive" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button type="submit" size="small" loading={savePending} disabled={blocked}>
                저장
              </Button>
            </FlexBox>
          </FlexBox>
        </form>
      ) : (
        <>
          <Typography as="div" variant="body2">
            <DocMarkdown>{doc.content}</DocMarkdown>
          </Typography>
          {/* 데모는 읽기만 — 편집 · 다시 만들기 버튼을 아예 보이지 않는다 */}
          {!demo && (
            <FlexBox justifyContent="flex-end" gap="8px" sx={{ marginTop: '12px' }}>
              <Button type="button" size="small" variant="outlined" color="assistive" onClick={() => setEditing(true)} disabled={blocked}>
                편집
              </Button>
              {ready && generateForm('다시 만들기', 'outlined', confirmRegenerate)}
            </FlexBox>
          )}
        </>
      )}

      {error && (
        <Box sx={{ marginTop: '8px' }}>
          <SectionMessage variant="negative">{error}</SectionMessage>
        </Box>
      )}
    </Box>
  );
}
