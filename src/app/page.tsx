'use client';

import { Box, Typography } from '@montage-ui/core';

// 설치 확인용 자리. A 단계에서 아이디어 작성 화면으로 교체한다.
export default function Home() {
  return (
    <Box as="main" sx={{ padding: '48px 24px' }}>
      <Typography variant="title1" weight="bold">
        Hatch
      </Typography>
      <Typography variant="body1" color="semantic.foreground.neutral.secondary">
        아이디어 한 줄이 기획안이 되는 곳
      </Typography>
    </Box>
  );
}
