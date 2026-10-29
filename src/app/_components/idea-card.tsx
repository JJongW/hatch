'use client';

import Link from 'next/link';
import { Card, CardBody, CardCaption, CardRow, CardTitle, ContentBadge, FlexBox } from '@montage-ui/core';

export type IdeaCardData = {
  id: string;
  title: string;
  /** 메모 첫 줄 */
  summary: string;
  /** 서버에서 포맷한 날짜 */
  date: string;
  progress: string;
  /** '' = 미분류 (배지 없음) */
  folder: string;
};

export default function IdeaCard({ id, title, summary, date, progress, folder }: IdeaCardData) {
  return (
    <Card as={Link} href={`/ideas/${id}`} sx={{ textDecoration: 'none' }}>
      <CardBody>
        <CardRow variant="badge" position="top">
          <FlexBox gap="4px">
            <ContentBadge size="xsmall" color={progress === '아이디어' ? 'neutral' : 'accent'}>
              {progress}
            </ContentBadge>
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
