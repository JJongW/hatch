'use client';

import Link from 'next/link';
import { createContext, useContext } from 'react';
import { Button } from '@montage-ui/core';

import type { PropsWithChildren } from 'react';

// 읽기 전용 데모인지. 서버(isDemo)가 정해 app-shell이 내려 준다
const DemoContext = createContext(false);

export const DemoProvider = ({ demo, children }: PropsWithChildren<{ demo: boolean }>) => (
  <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>
);

export const useDemo = () => useContext(DemoContext);

/** 데모에서 저장 · 생성 · 실행 버튼 자리에 놓는다 — 누를 수 있는 건 안내 페이지로 가는 것뿐 */
export function UseLocallyButton({ size = 'medium' }: { size?: 'small' | 'medium' }) {
  return (
    <Button as={Link} href="/start" size={size} variant="outlined" color="assistive">
      내 환경에서 사용하기
    </Button>
  );
}
