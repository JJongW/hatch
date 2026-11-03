'use client';

import Image from 'next/image';
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
import type { FocusEvent, ReactNode } from 'react';

import { hatchColor } from '@/lib/theme/tokens';

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
  // 흰 바탕 (spec mono-montage 2절: 회색 면 없음). 좁은 화면에선 위에 놓이고 아래 1px 선으로 나눈다
  background: theme.semantic.background.neutral.primary,
  borderBottom: `1px solid ${theme.semantic.line.neutral.primary}`,
  // 넓은 화면: 화면 가장자리에서 12px 띄운 둥근 패널 (#111, 사용자 요청: 네비 전체를 라운드로 묶어 옆에).
  // 회색은 선과 그림자에만. 화면 높이에 묶고 넘치면 패널 안에서 스크롤 (#76)
  [respondMore('768px')]: {
    width: '240px',
    flexShrink: 0,
    height: 'calc(100vh - 24px)',
    margin: '12px 0 12px 12px',
    alignSelf: 'flex-start',
    overflowY: 'auto' as const,
    position: 'sticky' as const,
    top: '12px',
    padding: '20px 12px',
    borderBottom: 'none',
    borderRadius: '16px',
    border: `1px solid ${theme.semantic.line.neutral.primary}`,
    boxShadow: theme.semantic.elevation.shadow.normal.small,
  },
});

/** 현재 경로를 아는 네비바. 동적 라우트에선 Suspense 안에서만 쓸 수 있다 (app-shell 참고). */
export default function SideNav() {
  return <SideNavView pathname={usePathname()} />;
}

// 로고: hatch_ic 아이콘(public/brand, 원본 1254px을 96px로 줄임) + 'Hatch'(Avigea) ↔ '해치'(HS산토끼체). 마우스를 올리거나 키보드로 포커스하면 뒤집힌다
function BrandLogo() {
  const [swapped, setSwapped] = useState(false);
  return (
    <Typography
      as={Link}
      href="/"
      variant="headline1"
      weight="bold"
      aria-label="Hatch 해치 — 아이디어 쓰기로"
      sx={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      onMouseEnter={() => setSwapped(true)}
      onMouseLeave={() => setSwapped(false)}
      onFocus={(e: FocusEvent<HTMLElement>) => setSwapped(e.currentTarget.matches(':focus-visible'))}
      onBlur={() => setSwapped(false)}
    >
      {/* 이름은 링크 aria-label이 읽는다 → 그림은 장식 */}
      <Image src="/brand/hatch-ic.png" alt="" width={24} height={24} />
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

// 지금 있는 메뉴: 라벤더 바탕 + 굵은 글자 (#111). 색만으로 알리지 않게 ListCell selected의 굵은 글자는 두고 오른쪽 체크만 뺀다(trailingContent null).
// full 변형 + 가로 여백 12px: 호버 층과 라벤더 바탕이 같은 폭으로 줄 안에 그려진다 (inset은 호버 층이 양옆으로 넘친다)
function NavItem({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <ListCell
      as={Link}
      href={href}
      variant="full"
      selected={active}
      trailingContent={null}
      aria-current={active ? 'page' : undefined}
      verticalPadding="small"
      sx={{
        '--list-cell-horizontal-padding': '12px',
        borderRadius: '8px',
        ...(active && { backgroundColor: hatchColor.highlight.bg, color: hatchColor.highlight.text }),
      }}
    >
      {children}
    </ListCell>
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
          <NavItem key={m.href} href={m.href} active={isActive(m.href)}>
            {m.label}
          </NavItem>
        ))}
      </FlexBox>

      <Divider />

      <FlexBox flexDirection="column" gap="4px">
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary" sx={{ paddingInline: '20px' }}>
          PO 도구
        </Typography>
        {TOOL_LINKS.map((t) =>
          t.ready ? (
            <NavItem key={t.href} href={t.href} active={isActive(t.href)}>
              {t.label}
            </NavItem>
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

      <NavItem href="/usage" active={isActive('/usage')}>
        사용량
      </NavItem>
    </Box>
  );
}
