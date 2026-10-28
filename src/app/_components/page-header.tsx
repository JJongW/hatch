'use client';

import { FlexBox, Typography } from '@montage-ui/core';

export default function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <FlexBox flexDirection="column" gap="4px" sx={{ marginBottom: '24px' }}>
      <Typography as="h1" variant="title2" weight="bold" sx={{ fontFamily: 'var(--font-title)' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">
          {description}
        </Typography>
      )}
    </FlexBox>
  );
}
