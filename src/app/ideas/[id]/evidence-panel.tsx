'use client';

import { FlexBox, TextButton, Typography } from '@montage-ui/core';

import type { Summary } from '@/lib/summary';

/** unknownPlaces: [확인 필요] 곳 수 (라벨 없는 것 포함). 현황 칸과 같은 단위 */
type Props = { summary: Summary; unknownPlaces: number; onOpenQuestions: () => void };

const block = (title: string, body: React.ReactNode) => (
  <FlexBox flexDirection="column" gap="4px">
    <Typography as="h3" variant="label1" weight="bold">
      {title}
    </Typography>
    {body}
  </FlexBox>
);

const text = (t: string) => (
  <Typography as="p" variant="body2" sx={{ maxWidth: '720px' }}>
    {t}
  </Typography>
);

/** 문제와 근거 탭. 모르는 것은 개수만 (목록은 확인 질문 탭 한 곳에만, spec detail-dashboard §2-4) */
export default function EvidencePanel({ summary, unknownPlaces, onOpenQuestions }: Props) {
  const { problem, evidence } = summary;
  return (
    <FlexBox flexDirection="column" gap="20px">
      {block('해결하려는 문제', text(problem.text))}
      {block('고객 근거', text(evidence.voc ? `고객 의견 ${evidence.voc.total}줄, 출발 순위 1번 ${evidence.voc.top}` : '아직 고객 근거가 없어요.'))}
      {block(
        '모르는 것',
        <FlexBox alignItems="center" gap="8px" sx={{ flexWrap: 'wrap' }}>
          {text(unknownPlaces > 0 ? `문서에 [확인 필요]가 ${unknownPlaces}곳 남아 있어요.` : '문서에 [확인 필요]가 없어요.')}
          {unknownPlaces > 0 && (
            <TextButton size="small" onClick={onOpenQuestions}>
              확인 질문 탭에서 보기
            </TextButton>
          )}
        </FlexBox>,
      )}
    </FlexBox>
  );
}
