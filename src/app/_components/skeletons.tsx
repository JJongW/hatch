'use client';

import { FlexBox, Skeleton } from '@montage-ui/core';

// 불러오는 동안 실제 화면과 같은 자리를 잡아, 다 뜬 뒤 화면이 덜컥 밀리지 않게 한다

function Busy({ children }: { children: React.ReactNode }) {
  return (
    <FlexBox flexDirection="column" gap="12px" aria-busy="true" aria-label="불러오는 중">
      {children}
    </FlexBox>
  );
}

/** PageHeader 자리 (제목 + 설명) */
function HeaderSkeleton() {
  return (
    <FlexBox flexDirection="column" gap="8px" sx={{ marginBottom: '12px' }}>
      <Skeleton width="40%" height="32px" />
      <Skeleton width="60%" height="20px" />
    </FlexBox>
  );
}

/** 쓰기 화면: 제목 칸, 메모 칸, 버튼 */
export function WriteSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton />
      <Skeleton width="100%" height="48px" />
      <Skeleton width="100%" height="96px" />
      <FlexBox justifyContent="flex-end">
        <Skeleton width="96px" height="40px" />
      </FlexBox>
    </Busy>
  );
}

/** 모음: 폴더 칩 한 줄 + 카드 목록 */
export function ListSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton />
      <FlexBox gap="6px">
        {[64, 80, 72, 56].map((w) => (
          <Skeleton key={w} width={`${w}px`} height="28px" />
        ))}
      </FlexBox>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} width="100%" height="88px" />
      ))}
    </Busy>
  );
}

/** 상세: 맥락, 요약 판, 문서 탭, 문서 본문 */
export function DetailSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton />
      <Skeleton width="100%" height="56px" />
      <Skeleton width="100%" height="160px" />
      <FlexBox gap="8px" sx={{ marginTop: '12px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="72px" height="32px" />
        ))}
      </FlexBox>
      <Skeleton width="100%" height="320px" />
    </Busy>
  );
}

/** PO 도구: 문서 고르기, 입력 칸, 실행 버튼 */
export function ToolSkeleton() {
  return (
    <Busy>
      <HeaderSkeleton />
      <Skeleton width="100%" height="48px" />
      <Skeleton width="100%" height="160px" />
      <FlexBox justifyContent="flex-end">
        <Skeleton width="96px" height="40px" />
      </FlexBox>
    </Busy>
  );
}
