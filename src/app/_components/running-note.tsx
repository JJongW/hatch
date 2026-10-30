'use client';

import { useEffect, useState } from 'react';
import { FlexBox, Loading, Typography } from '@montage-ui/core';

/** 1~2분 걸리는 생성 중 표시. 지난 시간을 같이 보여 줘 멈춘 건지 도는 건지 알 수 있게 한다 (이 화면을 연 뒤부터 센다) */
export default function RunningNote({ label }: { label: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${String(sec % 60).padStart(2, '0')}초`;

  return (
    <FlexBox alignItems="center" gap="8px" aria-live="polite">
      <Loading variant="circular" size={20} />
      <Typography variant="body2">{label}</Typography>
      <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
        {elapsed} 지남
      </Typography>
    </FlexBox>
  );
}
