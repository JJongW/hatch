'use client';

import { useState } from 'react';
import { FlexBox, TextArea, Typography } from '@montage-ui/core';

// 글자 수 대신 줄 수를 보여 준다 (빈 줄 제외, 한도는 MAX_VOC_LINES와 같다)
// shown: 데모에서 보는 결과의 입력 (읽기 전용). null = 그 결과에 원문이 없음, undefined = 직접 입력
export default function VocInputs({ shown }: { shown?: string[] | null }) {
  const [voc, setVoc] = useState('');
  if (shown !== undefined) {
    return (
      <FlexBox flexDirection="column" gap="4px">
        <TextArea value={shown?.join('\n') ?? ''} readOnly minRows={10} maxRows={20} width="100%" aria-label="VOC (이 결과의 입력)" />
        <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
          {shown ? `이 결과의 입력 ${shown.length}줄이에요. 데모라 고칠 수 없어요.` : '이 결과에는 입력 원문이 저장되지 않았어요.'}
        </Typography>
      </FlexBox>
    );
  }
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
        {count}줄 / 최대 200줄 (빈 줄 제외){count > 200 ? ', 200줄을 넘었어요' : ''}
      </Typography>
    </FlexBox>
  );
}
