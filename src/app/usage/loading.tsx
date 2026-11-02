'use client';

import { ListSkeleton } from '../_components/skeletons';
import WidePage from '../_components/wide-page';

// 하위 경로로 이동할 때도 Suspense 경계가 있어야 한다 (Next 16 instant navigation)
export default function Loading() {
  return (
    <>
      <WidePage />
      <ListSkeleton />
    </>
  );
}
