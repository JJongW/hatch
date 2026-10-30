'use client';

import { useActionState, useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, SectionMessage, TextArea, Typography } from '@montage-ui/core';

import { UseLocallyButton, useDemo } from '../../_components/demo';
import DocMarkdown from '../../_components/doc-markdown';
import RunningNote from '../../_components/running-note';

import type { Doc, DocKey } from '@/lib/storage';
import type { DocActionState } from '../../actions';

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

  const [genState, genAction, genPending] = useActionState(async (prev: DocActionState) => {
    onBusy(doc.key);
    try {
      return await generate(doc.key, prev);
    } finally {
      onBusy(null);
    }
  }, {});

  const [saveState, saveAction, savePending] = useActionState(async (prev: DocActionState, fd: FormData) => {
    const next = await update(doc.key, prev, fd);
    if (!next.error) setEditing(false);
    return next;
  }, {});

  const busy = genPending || running === doc.key;
  const blocked = running !== null || genPending || locked; // 어떤 생성이든 진행 중이면 다른 버튼은 막는다
  const error = genState.error ?? saveState.error;

  const confirmRegenerate = (e: React.FormEvent) => {
    if (!window.confirm('지금 문서는 .history에 남기고 새로 만들까요?')) e.preventDefault();
  };

  const generateForm = (label: string, variant: 'solid' | 'outlined', onSubmit?: (e: React.FormEvent) => void) => (
    <form action={genAction} onSubmit={onSubmit}>
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

      {busy ? (
        <RunningNote label="만드는 중이에요. 1~2분 걸려요." />
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
