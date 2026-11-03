'use client';

// 데이터 구성 문서의 ```mermaid 펜스를 그림으로 그린다. mermaid는 무거워서 이 블록이 화면에 있을 때만 불러온다.
// 그리기에 실패하면 코드 블록으로 대신 보여 준다 (복사는 그대로 된다)
import { useEffect, useId, useRef, useState } from 'react';
import { Box, FlexBox, TextButton, Typography, useToast } from '@montage-ui/core';
import { IconCopy } from '@montage-ui/icon';

import Panel from '@/components/panel';

import CodeBlock from './code-block';

// render마다 새 id. 개발 모드에선 effect가 두 번 돌아 같은 id로 겹쳐 그리면 mermaid 임시 DOM이 엉킬 수 있다
let seq = 0;

type View = { kind: 'loading' } | { kind: 'svg'; svg: string } | { kind: 'error' };

export default function MermaidBlock({ code }: { code: string }) {
  const base = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [view, setView] = useState<View>({ kind: 'loading' });
  const toast = useToast();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        // 엔티티가 많으면 폭에 맞춰 줄일 때 글자가 안 읽혀서, 원래 크기로 두고 상자 안에서 스크롤한다
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', er: { useMaxWidth: false } });
        const { svg } = await mermaid.render(`${base}-${++seq}`, code);
        if (alive) setView({ kind: 'svg', svg });
      } catch (e) {
        console.error('구성도를 그리지 못했어요', e);
        if (alive) setView({ kind: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [base, code]);

  // 큰 구성도는 왼쪽 위가 빈 자리일 때가 많아, 처음엔 가로 가운데를 보여 준다
  useEffect(() => {
    const box = boxRef.current;
    if (view.kind === 'svg' && box) box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
  }, [view]);

  if (view.kind === 'error')
    return (
      <>
        <Typography as="p" variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ margin: '0 0 6px' }}>
          구성도를 그림으로 그리지 못해 코드로 보여 줘요. 코드를 복사해 다른 도구에서 열 수 있어요.
        </Typography>
        <CodeBlock lang="mermaid" code={code} />
      </>
    );

  const fail = () => toast({ variant: 'cautionary', content: '복사하지 못했어요. 브라우저가 클립보드를 막았어요.' });
  const copy = () => {
    if (!navigator.clipboard) return fail();
    navigator.clipboard.writeText(code).then(
      () => toast({ variant: 'positive', content: '복사했어요' }),
      fail,
    );
  };

  return (
    <Panel flush sx={{ margin: '0 0 12px' }}>
      <FlexBox alignItems="center" justifyContent="space-between" sx={{ padding: '6px 8px 6px 16px' }}>
        <Typography variant="caption1" weight="bold" color="semantic.foreground.neutral.secondary">
          구성도
        </Typography>
        {/* 결과는 버튼 글자를 바꾸지 않고 Toast로 알린다 */}
        <TextButton size="small" color="assistive" onClick={copy} leadingContent={<IconCopy />}>
          구성도 코드 복사
        </TextButton>
      </FlexBox>
      <Box
        ref={boxRef}
        role="img"
        aria-label="데이터 구성도"
        sx={{
          minHeight: '160px',
          maxHeight: '560px',
          padding: '16px',
          overflow: 'auto',
          '& svg': { display: 'block', margin: '0 auto' },
        }}
        // mermaid securityLevel 'strict'가 라벨의 HTML · 스크립트를 걸러 낸 SVG다
        dangerouslySetInnerHTML={{ __html: view.kind === 'svg' ? view.svg : '' }}
      />
      {view.kind === 'loading' && (
        <Typography
          variant="caption1"
          color="semantic.foreground.neutral.secondary"
          sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
        >
          <span className="hatch-loader" aria-hidden style={{ '--hatch-loader-size': '14px' } as React.CSSProperties} />
          구성도를 그리는 중이에요
        </Typography>
      )}
    </Panel>
  );
}
