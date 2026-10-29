'use client';

import { useState } from 'react';
import { FlexBox, TextArea, Typography } from '@montage-ui/core';

/** 내 답 칸. 결과 상자 안에 놓인다 — 새 라운드 결과로 바뀌면 비운다 */
export default function NegotiationInputs({ resultId, maxChars }: { resultId: string; maxChars: number }) {
  const [answer, setAnswer] = useState('');
  const [seen, setSeen] = useState(resultId);
  if (seen !== resultId) {
    setSeen(resultId);
    setAnswer('');
  }
  return (
    <FlexBox flexDirection="column" gap="4px">
      <TextArea
        name="answer"
        value={answer}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
        minRows={5}
        maxRows={12}
        width="100%"
        aria-label="내 답"
        placeholder="상대 요청에 대한 내 답을 적어 주세요."
      />
      <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
        최대 {maxChars.toLocaleString('ko-KR')}자 · {answer.length.toLocaleString('ko-KR')}자
      </Typography>
    </FlexBox>
  );
}
