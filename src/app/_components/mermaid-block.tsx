'use client';

// 데이터 구성 문서의 ```mermaid 펜스를 그림으로 그린다. mermaid는 무거워서 이 블록이 화면에 있을 때만 불러온다.
// 그리기에 실패하면 코드 블록으로 대신 보여 준다 (복사는 그대로 된다)
import { useEffect, useId, useState } from 'react';
import { Box, FlexBox, TextButton, Typography } from '@montage-ui/core';
import { IconCheck, IconCopy } from '@montage-ui/icon';

import type { Theme } from '@montage-ui/core';

import CodeBlock from './code-block';

type View = { kind: 'loading' } | { kind: 'svg'; svg: string } | { kind: 'error' };

export default function MermaidBlock({ code }: { code: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
        const { svg } = await mermaid.render(id, code);
        if (alive) setView({ kind: 'svg', svg });
      } catch (e) {
        console.error('구성도를 그리지 못했어요', e);
        if (alive) setView({ kind: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, code]);

  if (view.kind === 'error') return <CodeBlock lang="mermaid" code={code} />;

  const copy = () =>
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });

  return (
    <Box
      sx={(theme: Theme) => ({
        border: `1px solid ${theme.semantic.line.neutral.primary}`,
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '0 0 12px',
      })}
    >
      <FlexBox alignItems="center" justifyContent="space-between" sx={{ padding: '6px 8px 6px 16px' }}>
        <Typography variant="caption1" weight="bold" color="semantic.foreground.neutral.secondary">
          구성도
        </Typography>
        <TextButton size="small" color="assistive" onClick={copy} leadingContent={copied ? <IconCheck /> : <IconCopy />} aria-live="polite">
          {copied ? '복사했어요' : '구성도 코드 복사'}
        </TextButton>
      </FlexBox>
      <Box
        role="img"
        aria-label="데이터 구성도"
        sx={(theme: Theme) => ({
          minHeight: '160px',
          padding: '16px',
          overflowX: 'auto',
          background: theme.semantic.surface.neutral.secondary,
          '& svg': { display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' },
        })}
        // mermaid securityLevel 'strict'가 라벨의 HTML · 스크립트를 걸러 낸 SVG다
        dangerouslySetInnerHTML={view.kind === 'svg' ? { __html: view.svg } : undefined}
      />
    </Box>
  );
}
