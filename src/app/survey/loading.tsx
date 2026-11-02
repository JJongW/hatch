'use client';

import FocusPage from '../_components/focus-page';
import { WriteSkeleton } from '../_components/skeletons';

export default function Loading() {
  return (
    <>
      <FocusPage />
      <WriteSkeleton />
    </>
  );
}
