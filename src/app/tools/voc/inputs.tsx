'use client';

import { useState } from 'react';
import { FlexBox, TextArea, Typography } from '@montage-ui/core';

// 글자 수 대신 줄 수를 보여 준다 (빈 줄 제외, 한도는 MAX_VOC_LINES와 같다)
export default function VocInputs() {
  const [voc, setVoc] = useState('');
  const count = voc.split('\n').filter((l) => l.trim()).length;
  return (
    <FlexBox flexDirection="column" gap="4px">
      <TextArea
        name="voc"
        value={voc}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVoc(e.target.value)}
        minRows={10}
        maxRows={20}
        width="100%"
        aria-label="VOC"
        placeholder={'한 줄에 VOC 하나씩 붙여넣어 주세요.\n예) 결제하다가 앱이 꺼져요'}
      />
      <Typography variant="caption1" color={count > 200 ? 'semantic.foreground.negative.primary' : 'semantic.foreground.neutral.tertiary'}>
        {count}줄 / 최대 200줄 (빈 줄 제외)
      </Typography>
    </FlexBox>
  );
}
