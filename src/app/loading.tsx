'use client';

import { WriteSkeleton } from './_components/skeletons';

// Next 16: 요청 시 파일을 읽는 페이지는 Suspense 경계가 필요하다. 루트 loading이 모든 페이지를 감싸고, 하위 경로는 자기 모양을 쓴다.
export default WriteSkeleton;
