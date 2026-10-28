'use client';

import { Box, Button, ContentBadge, FlexBox, Typography } from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import IdeaForm from '../../_components/idea-form';
import PageHeader from '../../_components/page-header';
import SectionTitle from '../../_components/section-title';

import type { Doc } from '@/lib/storage';
import type { FormState } from '../../actions';

type Props = {
  idea: { title: string; memo: string };
  docs: Doc[];
  updateAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  trashAction: () => Promise<void>;
};

const docBoxStyle = (theme: Theme) => ({
  border: `1px solid ${theme.semantic.line.neutral.primary}`,
  borderRadius: '12px',
  padding: '16px',
});

const preStyle = {
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
  font: 'inherit',
  maxHeight: '320px',
  overflow: 'auto',
};

export default function IdeaDetail({ idea, docs, updateAction, trashAction }: Props) {
  const confirmTrash = (e: React.FormEvent) => {
    if (!window.confirm('휴지통(~/Hatch/.trash)으로 옮길까요? 파일은 지워지지 않아요.')) e.preventDefault();
  };

  return (
    <>
      <PageHeader title={idea.title} description="아이디어를 고치고, 아래에서 이어지는 문서를 확인해요." />
      <IdeaForm action={updateAction} submitLabel="수정 저장" initial={idea} />

      <form action={trashAction} onSubmit={confirmTrash}>
        <FlexBox justifyContent="flex-end" sx={{ marginTop: '8px' }}>
          <Button type="submit" variant="outlined" color="assistive" size="small">
            휴지통으로
          </Button>
        </FlexBox>
      </form>

      <SectionTitle>문서</SectionTitle>
      <FlexBox flexDirection="column" gap="12px">
        {docs.map((doc, i) => (
          <Box key={doc.key} sx={docBoxStyle}>
            <FlexBox alignItems="center" gap="8px" sx={{ marginBottom: '8px' }}>
              <Typography variant="headline2" weight="bold">
                {i + 1}. {doc.label}
              </Typography>
              <ContentBadge size="xsmall" variant="outlined" color={doc.content === null ? 'neutral' : 'accent'}>
                {doc.content === null ? '아직 없음' : doc.file}
              </ContentBadge>
            </FlexBox>
            {doc.content === null ? (
              <Typography variant="body2" color="semantic.foreground.neutral.tertiary">
                B 단계에서 생성
              </Typography>
            ) : (
              <Typography as="pre" variant="body2" sx={preStyle}>
                {doc.content}
              </Typography>
            )}
          </Box>
        ))}
      </FlexBox>
    </>
  );
}
