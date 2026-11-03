'use client';

import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@montage-ui/core';

/** 결과 상자 위 요약 표 바로 아래 접힌 "분석에 사용한 VOC" (spec 2026-11-03 §5). 예전 결과는 원문이 없다고 그대로 말한다 */
export default function VocInputLines({ lines }: { lines: string[] | null }) {
  if (lines === null) {
    return (
      <Typography variant="caption1" color="semantic.foreground.neutral.secondary" sx={{ display: 'block', marginTop: '12px' }}>
        이 결과에는 입력 원문이 저장되지 않았어요.
      </Typography>
    );
  }
  return (
    <Accordion divider={false}>
      <AccordionSummary>{`분석에 사용한 VOC 보기 (${lines.length}줄)`}</AccordionSummary>
      <AccordionDetails>
        <Box as="ol" sx={{ margin: 0, paddingLeft: '28px', maxHeight: '320px', overflow: 'auto' }}>
          {lines.map((l, i) => (
            <Typography key={i} as="li" variant="body2">
              {l}
            </Typography>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
