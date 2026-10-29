'use client';

import Link from 'next/link';
import { Chip, FlexBox } from '@montage-ui/core';

import type { FolderCount } from '@/lib/storage';

// 미분류 화면 이름 · 주소 값 (storage UNFILED와 같은 값. 화면은 storage 값을 import하지 않는다)
const UNFILED = '미분류';

type Props = { folders: FolderCount[]; total: number; selected: string | null };

/** 모음 화면 위 폴더 칩 줄. 폴더가 없으면 그리지 않는다 */
export default function FolderChips({ folders, total, selected }: Props) {
  if (folders.length === 0) return null;
  const chip = (label: string, count: number, href: string, active: boolean) => (
    <Chip key={href} as={Link} href={href} size="small" variant="outlined" active={active} scroll={false}>
      {label} {count}
    </Chip>
  );
  return (
    <FlexBox gap="6px" sx={{ flexWrap: 'wrap', marginBottom: '16px' }}>
      {chip('전체', total, '/ideas', selected === null)}
      {folders.map((f) => {
        const label = f.name || UNFILED;
        return chip(label, f.count, `/ideas?folder=${encodeURIComponent(label)}`, selected === f.name);
      })}
    </FlexBox>
  );
}
