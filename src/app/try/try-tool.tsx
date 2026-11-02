'use client';

import { useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, Typography } from '@montage-ui/core';

import { primaryActionSx } from '@/lib/theme/tokens';

import DocMarkdown from '../_components/doc-markdown';
import RunningNote from '../_components/running-note';

import type { Theme } from '@montage-ui/core';

import type { ToolInfo } from '@/lib/try/flow';

type Props = {
  info: ToolInfo;
  /** 입력 칸 (PRD 미리보기, VOC 붙여넣기) */
  input: React.ReactNode;
  /** 아직 실행할 수 없는 이유. 있으면 실행 버튼 대신 보인다 */
  blocked?: React.ReactNode;
  /** 지금까지의 예시 결과. 마지막 것만 보여 준다 */
  result: string | null;
  /** 실행 버튼 문구. 없으면 더 실행할 게 없다 */
  runLabel: string | null;
  onRun: () => Promise<void>;
};

const box = (theme: Theme) => ({ border: `1px solid ${theme.semantic.line.neutral.primary}`, borderRadius: '12px', padding: '16px' });

// 실제 도구 틀(ToolFrame)은 주소와 서버 새로 그리기에 묶여 있어, 체험에서는 같은 모양의 작은 화면을 쓴다 (spec §2)
export default function TryTool({ info, input, blocked, result, runLabel, onRun }: Props) {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      await onRun();
    } finally {
      setRunning(false);
    }
  };

  return (
    <FlexBox flexDirection="column" gap="16px">
      <Box>
        <Typography as="h2" variant="headline2" weight="bold" sx={{ display: 'block', marginBottom: '4px' }}>
          {info.label}
        </Typography>
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">
          {info.description}
        </Typography>
      </Box>
      <Box sx={box}>{input}</Box>
      {blocked ??
        (running ? (
          <RunningNote label="만드는 중이에요. 실제로는 1~2분 걸려요." />
        ) : (
          runLabel && (
            <FlexBox justifyContent="flex-end">
              <Button variant={result ? 'outlined' : 'solid'} color={result ? 'assistive' : 'primary'} sx={result ? undefined : primaryActionSx} onClick={run}>
                {runLabel}
              </Button>
            </FlexBox>
          )
        ))}
      {result && (
        <Box sx={box}>
          <ContentBadge size="xsmall" variant="outlined" color="accent" sx={{ marginBottom: '8px' }}>
            예시 결과
          </ContentBadge>
          <Typography as="div" variant="body2">
            <DocMarkdown>{result}</DocMarkdown>
          </Typography>
        </Box>
      )}
    </FlexBox>
  );
}
