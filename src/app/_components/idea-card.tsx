'use client';

import Link from 'next/link';
import { Card, CardBody, CardCaption, CardRow, CardTitle, ContentBadge } from '@montage-ui/core';

export type IdeaCardData = {
  id: string;
  title: string;
  /** 메모 첫 줄 */
  summary: string;
  /** 서버에서 포맷한 날짜 */
  date: string;
  progress: string;
};

export default function IdeaCard({ id, title, summary, date, progress }: IdeaCardData) {
  return (
    <Card as={Link} href={`/ideas/${id}`} sx={{ textDecoration: 'none' }}>
      <CardBody>
        <CardRow variant="badge" position="top">
          <ContentBadge size="xsmall" color={progress === '아이디어' ? 'neutral' : 'accent'}>
            {progress}
          </ContentBadge>
        </CardRow>
        <CardTitle>{title}</CardTitle>
        {summary && <CardCaption>{summary}</CardCaption>}
        <CardCaption color="semantic.foreground.neutral.tertiary">{date}</CardCaption>
      </CardBody>
    </Card>
  );
}
