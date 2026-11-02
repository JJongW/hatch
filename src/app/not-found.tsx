'use client';

import Link from 'next/link';
import { Button, FlexBox } from '@montage-ui/core';

import PageHeader from './_components/page-header';

// notFound()를 부르거나 없는 주소로 오면 뜬다 (휴지통으로 보낸 아이디어 주소 포함)
export default function NotFound() {
  return (
    <FlexBox flexDirection="column" gap="16px">
      <PageHeader title="찾는 페이지가 없어요" description="주소가 바뀌었거나 휴지통으로 보낸 아이디어일 수 있어요." />
      <FlexBox gap="8px">
        <Button as={Link} href="/ideas">
          아이디어 모음으로
        </Button>
        <Button as={Link} href="/" variant="outlined" color="assistive">
          새 아이디어 쓰기
        </Button>
      </FlexBox>
    </FlexBox>
  );
}
