'use client';

import { FlexBox, Skeleton } from '@montage-ui/core';

// Next 16: 요청 시 파일을 읽는 페이지는 Suspense 경계가 필요하다. 루트 loading이 모든 페이지를 감싼다.
export default function Loading() {
  return (
    <FlexBox flexDirection="column" gap="12px" aria-busy="true" aria-label="불러오는 중">
      <Skeleton width="40%" height="32px" />
      <Skeleton width="100%" height="96px" />
      <Skeleton width="100%" height="96px" />
    </FlexBox>
  );
}
