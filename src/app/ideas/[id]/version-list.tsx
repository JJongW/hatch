'use client';

import { useState, useTransition } from 'react';
import { Box, Button, FlexBox, SectionMessage, TextButton, Typography, type Theme } from '@montage-ui/core';

import DocMarkdown from '../../_components/doc-markdown';
import DiffView, { formatWhen } from './diff-view';

import type { Doc } from '@/lib/storage';

type Props = {
  doc: Doc & { content: string };
  read: (name: string) => Promise<{ content?: string; error?: string }>;
  /** 생성 중엔 막는다 (Server Action은 하나씩 실행돼 생성이 끝날 때까지 멈춤) */
  disabled: boolean;
};

// 이전 버전 보기: 덮어쓰기 전 판(.history)을 시각 순으로. 읽기만 하고 되돌리기는 없다 (spec §9)
export default function VersionList({ doc, read, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<{ name: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (doc.versions.length === 0) return null;

  const pick = (name: string) =>
    start(async () => {
      const r = await read(name);
      setError(r.error ?? null);
      setShown(r.content !== undefined ? { name, content: r.content } : null);
    });

  return (
    <Box sx={{ marginTop: '12px' }}>
      <TextButton size="small" color="assistive" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden>{open ? '▾ ' : '▸ '}</span>
        이전 버전 보기 ({doc.versions.length})
      </TextButton>
      {open && (
        <FlexBox flexDirection="column" gap="8px" sx={{ marginTop: '8px' }}>
          <FlexBox gap="6px" sx={{ flexWrap: 'wrap' }} role="group" aria-label="이전 버전">
            {doc.versions.map((v) => (
              <Button
                key={v.name}
                size="small"
                variant={shown?.name === v.name ? 'solid' : 'outlined'}
                color={shown?.name === v.name ? 'primary' : 'assistive'}
                aria-pressed={shown?.name === v.name}
                onClick={() => pick(v.name)}
                disabled={pending || disabled}
              >
                {formatWhen(v.at)}
              </Button>
            ))}
          </FlexBox>
          {error && <SectionMessage variant="negative">{error}</SectionMessage>}
          {shown && (
            <Box sx={(t: Theme) => ({ border: `1px solid ${t.semantic.line.neutral.primary}`, borderRadius: '12px', padding: '12px 16px' })}>
              <Typography variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block', marginBottom: '8px' }}>
                {formatWhen(doc.versions.find((v) => v.name === shown.name)?.at ?? '')} 판 — 읽기 전용. 지금 판과 비교:
              </Typography>
              <DiffView before={shown.content} after={doc.content} title="이 판에서 지금 판으로 바뀐 줄 보기" />
              <Box sx={{ maxHeight: '320px', overflow: 'auto', marginTop: '8px' }}>
                <Typography as="div" variant="body2">
                  <DocMarkdown>{shown.content}</DocMarkdown>
                </Typography>
              </Box>
            </Box>
          )}
        </FlexBox>
      )}
    </Box>
  );
}
