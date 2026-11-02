'use client'; // 오류 경계는 Client Component여야 한다

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, FlexBox, Typography } from '@montage-ui/core';

import { primaryActionSx } from '@/lib/theme/tokens';

import PageHeader from './_components/page-header';

// Next 16: 예상 못 한 오류가 나면 이 화면이 페이지 자리에 뜬다 (네비바는 그대로). retry는 다시 받아 그린다
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error('[hatch] 화면 오류', error);
  }, [error]);
  // 운영 빌드에서 서버 오류는 내용 대신 번호(digest)만 온다. 서버 로그에서 같은 번호를 찾으면 된다
  const digest = error instanceof Error && 'digest' in error ? String(error.digest) : null;

  return (
    <FlexBox flexDirection="column" gap="16px">
      <PageHeader title="화면을 불러오지 못했어요" description="저장한 아이디어와 문서는 그대로 있어요. 다시 시도해도 같으면 서버 로그를 확인해 주세요." />
      {digest && (
        <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
          오류 번호 {digest}
        </Typography>
      )}
      <FlexBox gap="8px">
        <Button onClick={() => retry()} sx={primaryActionSx}>다시 시도</Button>
        <Button as={Link} href="/ideas" variant="outlined" color="assistive">
          아이디어 모음으로
        </Button>
      </FlexBox>
    </FlexBox>
  );
}
