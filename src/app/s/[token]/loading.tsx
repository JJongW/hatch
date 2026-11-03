'use client';

import FocusPage from '../../_components/focus-page';
import { DetailSkeleton } from '../../_components/skeletons';

export default function Loading() {
  return (
    <>
      <FocusPage wide />
      <DetailSkeleton />
    </>
  );
}
