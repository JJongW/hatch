'use client';

// AICSS "Code Block"(MIT, aicss.dev/components/code-block)을 Montage로 옮겼다. 바꾼 점:
// - CSS Module 대신 Montage 토큰 · TextButton · 아이콘
// - 긴 한국어 프롬프트라 가로 스크롤 대신 줄바꿈
// - `[확인 필요: …]` 자리를 색으로 표시, 복사가 막히면 본문을 선택해 둔다
import { useRef } from 'react';
import { Box, FlexBox, TextButton, Typography, useToast } from '@montage-ui/core';
import { IconCopy } from '@montage-ui/icon';

import type { Theme } from '@montage-ui/core';

import Panel from '@/components/panel';
import { splitTbd } from '@/lib/tbd';
import { hatchColor } from '@/lib/theme/tokens';

// 문서에서 나오는 펜스: 프롬프트(~~~text), 구성도(```mermaid, 그리기 실패 때만 여기로). 다른 언어가 생기면 이름을 더한다
const LABELS: Record<string, string> = { text: '프롬프트', mermaid: '구성도' };

const body = {
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  columnGap: '12px',
  padding: '10px 16px 12px 8px',
  maxHeight: '480px',
  overflowY: 'auto' as const,
  // 흰 바탕. 테두리 상자(Panel) 안이라 면을 따로 깔지 않는다 (spec mono-montage 2절)
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12.5px',
  lineHeight: '20px',
};

export default function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const toast = useToast();
  const codeRef = useRef<HTMLDivElement>(null);
  const lines = code.split('\n');

  // 클립보드가 막힌 환경(권한 · 오래된 브라우저)에선 본문을 선택해 두고 직접 복사하게 한다
  const selectAll = () => {
    if (!codeRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(codeRef.current);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    toast({ variant: 'cautionary', content: '복사가 막혀 본문을 선택해 뒀어요. ⌘C로 복사해요.' });
  };
  const copy = () => {
    if (!navigator.clipboard) return selectAll();
    navigator.clipboard.writeText(code).then(() => toast({ variant: 'positive', content: '복사했어요' }), selectAll);
  };

  return (
    <Panel flush sx={{ margin: '0 0 12px' }}>
      <FlexBox alignItems="center" justifyContent="space-between" sx={{ padding: '6px 8px 6px 16px' }}>
        <Typography variant="caption1" weight="bold" color="semantic.foreground.neutral.secondary">
          {LABELS[lang] ?? (lang || '코드')}
        </Typography>
        {/* 결과는 버튼 글자를 바꾸지 않고 Toast로 알린다 */}
        <TextButton size="small" color="assistive" onClick={copy} leadingContent={<IconCopy />}>
          복사
        </TextButton>
      </FlexBox>
      <Box sx={body}>
        {/* 줄 번호는 복사 · 선택에서 빠지게 aria-hidden + userSelect none */}
        <Box aria-hidden sx={(theme: Theme) => ({ color: theme.semantic.foreground.neutral.quaternary, textAlign: 'right', userSelect: 'none' })}>
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </Box>
        <Box ref={codeRef} sx={(theme: Theme) => ({ minWidth: 0, color: theme.semantic.foreground.neutral.primary })}>
          {lines.map((line, i) => (
            <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {line === ''
                ? ' '
                : splitTbd(line).map((s, j) =>
                    s.tbd ? (
                      <Box
                        key={j}
                        as="mark"
                        sx={{ background: hatchColor.highlight.bg, color: hatchColor.highlight.text, borderRadius: '3px' }}
                      >
                        {s.text}
                      </Box>
                    ) : (
                      s.text
                    ),
                  )}
            </div>
          ))}
        </Box>
      </Box>
    </Panel>
  );
}
