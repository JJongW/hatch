'use client';

import { FlexBox, SectionHeader, Typography } from '@montage-ui/core';

/** 페이지 맨 위 제목(h1) + 설명. 제목은 Montage SectionHeader large (title2) */
export default function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <FlexBox flexDirection="column" gap="4px" sx={{ marginBottom: '24px' }}>
      <SectionHeader size="large" headingTag="h1">
        {title}
      </SectionHeader>
      {description && (
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">
          {description}
        </Typography>
      )}
    </FlexBox>
  );
}
