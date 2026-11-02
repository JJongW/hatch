'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Box,
  ContentBadge,
  Divider,
  FlexBox,
  ListCell,
  ListCellContent,
  respondMore,
  Typography,
} from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';
import type { FocusEvent } from 'react';

import FlippingWordSwap from './flipping-word-swap';

const MAIN = [
  { href: '/', label: '아이디어 쓰기' },
  { href: '/ideas', label: '아이디어 모음' },
];

// 도구가 완성되면 ready: true
const TOOL_LINKS = [
  { label: 'PRD 리뷰 위원회', href: '/tools/prd-review', ready: true },
  { label: 'VOC 우선순위', href: '/tools/voc', ready: true },
  { label: '지표와 실험 설계', href: '/tools/metrics', ready: true },
  { label: '이해관계자 협상', href: '/tools/negotiation', ready: true },
];

const navStyle = (theme: Theme) => ({
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  padding: '16px',
  borderBottom: `1px solid ${theme.semantic.line.neutral.primary}`,
  [respondMore('768px')]: {
    width: '240px',
    flexShrink: 0,
    // 틀 높이만큼 늘어나면 sticky가 듣지 않는다. 화면 높이로 묶고 넘치면 네비바 안에서 스크롤 (#76)
    height: '100vh',
    alignSelf: 'flex-start',
    overflowY: 'auto' as const,
    position: 'sticky' as const,
    top: 0,
    padding: '24px 16px',
    borderBottom: 'none',
    borderRight: `1px solid ${theme.semantic.line.neutral.primary}`,
  },
});

/** 현재 경로를 아는 네비바. 동적 라우트에선 Suspense 안에서만 쓸 수 있다 (app-shell 참고). */
export default function SideNav() {
  return <SideNavView pathname={usePathname()} />;
}

// 로고: 'Hatch'(Avigea) ↔ '해치'(HS산토끼체). 마우스를 올리거나 키보드로 포커스하면 뒤집힌다
function BrandLogo() {
  const [swapped, setSwapped] = useState(false);
  return (
    <Typography
      as={Link}
      href="/"
      variant="headline1"
      weight="bold"
      aria-label="Hatch 해치 — 아이디어 쓰기로"
      sx={{ textDecoration: 'none' }}
      onMouseEnter={() => setSwapped(true)}
      onMouseLeave={() => setSwapped(false)}
      onFocus={(e: FocusEvent<HTMLElement>) => setSwapped(e.currentTarget.matches(':focus-visible'))}
      onBlur={() => setSwapped(false)}
    >
      🐣{' '}
      <FlippingWordSwap
        word1="Hatch"
        word2="해치"
        swapped={swapped}
        style={{ fontFamily: 'var(--font-logo-en)', fontWeight: 400 }}
        toStyle={{ fontFamily: 'var(--font-logo-ko)' }}
      />
    </Typography>
  );
}

/** 경로를 모를 때(Suspense 대기 중)는 강조 없이 그린다 */
export function SideNavView({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    pathname !== null && (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <Box as="nav" aria-label="주 메뉴" sx={navStyle}>
      <BrandLogo />

      <FlexBox flexDirection="column">
        {MAIN.map((m) => (
          <ListCell key={m.href} as={Link} href={m.href} selected={isActive(m.href)} verticalPadding="small">
            {m.label}
          </ListCell>
        ))}
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
          PO 도구
        </Typography>
        {TOOL_LINKS.map((t) =>
          t.ready ? (
            <ListCell key={t.href} as={Link} href={t.href} selected={isActive(t.href)} verticalPadding="small">
              {t.label}
            </ListCell>
          ) : (
            <ListCell
              key={t.href}
              as="div"
              disabled
              verticalPadding="small"
              trailingContent={
                <ListCellContent>
                  <ContentBadge size="xsmall" variant="outlined">
                    준비 중
                  </ContentBadge>
                </ListCellContent>
              }
            >
              {t.label}
            </ListCell>
          ),
        )}
      </FlexBox>

      <Divider />

      <ListCell as={Link} href="/usage" selected={isActive('/usage')} verticalPadding="small">
        사용량
      </ListCell>
    </Box>
  );
}
