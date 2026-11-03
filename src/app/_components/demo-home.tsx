'use client';

import Link from 'next/link';
import { Button, FlexBox } from '@montage-ui/core';

// 공개 데모 첫 화면: 저장 폼 대신 해 볼 수 있는 것 두 가지. 주 행동은 흐름 체험 하나 (spec 2026-11-03 §5)
// 읽기 전용 안내는 모든 화면 위 데모 띠(app-shell)가 한다. 데모의 제한은 이 공개 사이트만의 것이다
export default function DemoHome({ sampleId }: { sampleId: string }) {
  return (
    <FlexBox flexDirection="column" gap="16px" alignItems="flex-start">
      <FlexBox gap="8px" sx={{ flexWrap: 'wrap' }}>
        <Button as={Link} href="/try" size="large">
          흐름 체험하기
        </Button>
        <Button as={Link} href={`/ideas/${sampleId}`} size="large" variant="outlined" color="assistive">
          완성된 예시 보기
        </Button>
      </FlexBox>
    </FlexBox>
  );
}
