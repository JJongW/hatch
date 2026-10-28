'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** on인 동안 ms마다 서버 데이터를 다시 받는다 (다른 탭 · 새로고침 뒤 생성 중 표시용) */
export function useRefreshWhile(on: boolean, ms = 3000) {
  const router = useRouter();
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [on, ms, router]);
}
