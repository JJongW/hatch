'use client';

import { useState } from 'react';
import { FlexBox, TextArea, Typography } from '@montage-ui/core';

import { MAX_ANSWER_CHARS } from '@/lib/tools/negotiation/compute';

/** 내 답 칸. 새 라운드 결과로 바뀌면 비운다 (프레임은 실행 뒤 입력을 남긴다) */
export default function NegotiationInputs({ resultId }: { resultId: string | null }) {
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
        placeholder={resultId ? '상대 요청에 대한 내 답을 적어 주세요.' : "1라운드는 비워 두고 '실행'을 눌러 상대 요청을 받아요."}
      />
      <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
        새 협상은 비워 두고 &apos;실행&apos; · 답은 결과 아래 &apos;내 답 보내기&apos; · 최대 {MAX_ANSWER_CHARS.toLocaleString('ko-KR')}자 · {answer.length.toLocaleString('ko-KR')}자
      </Typography>
    </FlexBox>
  );
}
