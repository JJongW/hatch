'use client';

import Link from 'next/link';
import { addOpacity, Card, CardBody, CardCaption, CardRow, CardTitle, ContentBadge, FlexBox, Typography, type Theme } from '@montage-ui/core';

export type IdeaCardData = {
  id: string;
  title: string;
  /** 메모 첫 줄 */
  summary: string;
  /** 서버에서 포맷한 날짜 */
  date: string;
  progress: string;
  /** 만든 문서 수. null = 문서 없음 (표시 안 함) */
  docs: { done: number; total: number } | null;
  /** '' = 미분류 (배지 없음) */
  folder: string;
};

// 마우스를 올리면 배경이 0.2초에 걸쳐 바뀌고, 누르는 순간 살짝 줄어든다 (spec motion §3).
// 배경은 색 대신 본문색 5% 틴트 (색은 포인트에만, #103). 한 장씩 옅은 테두리로 묶어 목록 위계를 만든다
const hoverable = (t: Theme) => ({
  textDecoration: 'none',
  display: 'block',
  padding: '12px 16px',
  border: `1px solid ${t.semantic.line.neutral.primary}`,
  borderRadius: '12px',
  transition: 'background-color 200ms ease-out, transform 120ms ease-out',
  '&:hover': { backgroundColor: addOpacity(t.semantic.foreground.neutral.primary, t.opacity[5]) },
  '&:active': { transform: 'scale(0.99)' },
});

export default function IdeaCard({ id, title, summary, date, progress, docs, folder }: IdeaCardData) {
  return (
    <Card as={Link} href={`/ideas/${id}`} sx={hoverable}>
      <CardBody>
        <CardRow variant="badge" position="top">
          <FlexBox gap="4px" alignItems="center">
            <ContentBadge size="xsmall" color={progress === '아이디어' ? 'neutral' : 'accent'}>
              {progress}
            </ContentBadge>
            {docs && (
              <Typography
                as="span"
                role="img"
                aria-label={`문서 ${docs.total}개 중 ${docs.done}개 완료`}
                variant="caption2"
                color="semantic.foreground.neutral.secondary"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {`${docs.done}/${docs.total}`}
              </Typography>
            )}
            {folder && (
              <ContentBadge size="xsmall" variant="outlined" color="neutral">
                {folder}
              </ContentBadge>
            )}
          </FlexBox>
        </CardRow>
        <CardTitle>{title}</CardTitle>
        {summary && <CardCaption>{summary}</CardCaption>}
        <CardCaption color="semantic.foreground.neutral.tertiary">{date}</CardCaption>
      </CardBody>
    </Card>
  );
}
