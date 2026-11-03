'use client';

import { isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import { Typography } from '@montage-ui/core';

import type { Components } from 'react-markdown';

import CodeBlock from './code-block';
import MermaidBlock from './mermaid-block';

// Montage 전역 리셋이 태그 기본 스타일을 지우므로 요소마다 Typography로 다시 입힌다.
// 요소가 더 필요해지면(표 등) remark 플러그인과 함께 별도 정리한다.

// 펜스 코드 블록: <pre><code class="language-text">…</code></pre> → CodeBlock (mermaid는 그림으로)
function Pre({ children }: { children?: React.ReactNode }) {
  const code = isValidElement<{ className?: string; children?: React.ReactNode }>(children) ? children.props : null;
  const lang = /language-(\S+)/.exec(code?.className ?? '')?.[1] ?? '';
  const text = String(code?.children ?? '').replace(/\n$/, '');
  return lang === 'mermaid' ? <MermaidBlock code={text} /> : <CodeBlock lang={lang} code={text} />;
}
const heading = (variant: 'headline1' | 'headline2', as: 'h1' | 'h2' | 'h3') =>
  function Heading({ children }: { children?: React.ReactNode }) {
    return (
      <Typography as={as} variant={variant} weight="bold" sx={{ display: 'block', margin: '24px 0 8px', '&:first-child': { marginTop: 0 } }}>
        {children}
      </Typography>
    );
  };

const list = (as: 'ul' | 'ol') =>
  function List({ children }: { children?: React.ReactNode }) {
    return (
      <Typography as={as} variant="body2" sx={{ display: 'block', margin: '0 0 12px', paddingLeft: '20px', listStyle: as === 'ul' ? 'disc' : 'decimal' }}>
        {children}
      </Typography>
    );
  };

const components: Components = {
  h1: heading('headline1', 'h1'),
  h2: heading('headline1', 'h2'),
  h3: heading('headline2', 'h3'),
  p: ({ children }) => (
    <Typography as="p" variant="body2" sx={{ display: 'block', margin: '0 0 12px' }}>
      {children}
    </Typography>
  ),
  ul: list('ul'),
  ol: list('ol'),
  li: ({ children }) => (
    <Typography as="li" variant="body2" sx={{ display: 'list-item', margin: '0 0 4px' }}>
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Typography as="strong" variant="body2" weight="bold" sx={{ display: 'inline' }}>
      {children}
    </Typography>
  ),
  pre: Pre,
};

// 공유 화면: 문서 속 바깥 이미지를 열면 보는 사람 IP가 그 서버로 샌다 → 글자로만 (spec 2026-11-03-hosted-po §3-4)
const hiddenImage: Components = {
  img: ({ alt }) => (
    <Typography as="span" variant="body2" color="semantic.foreground.neutral.secondary" sx={{ display: 'inline' }}>
      {`[이미지${alt ? `: ${alt}` : ''} (공유 화면에서는 숨김)]`}
    </Typography>
  ),
};
const sharedComponents: Components = { ...components, ...hiddenImage };

export default function DocMarkdown({ children, images = 'show' }: { children: string; images?: 'show' | 'hide' }) {
  return <ReactMarkdown components={images === 'hide' ? sharedComponents : components}>{children}</ReactMarkdown>;
}
