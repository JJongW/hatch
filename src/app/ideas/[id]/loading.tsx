'use client';

import { DetailSkeleton } from '../../_components/skeletons';
import WidePage from '../../_components/wide-page';

export default function Loading() {
  return (
    <>
      <WidePage />
      <DetailSkeleton />
    </>
  );
}
