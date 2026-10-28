'use client';

import Link from 'next/link';
import {
  FallbackView,
  FallbackViewActionArea,
  FallbackViewActionAreaButton,
  FallbackViewContent,
  FallbackViewText,
  FlexBox,
  Typography,
} from '@montage-ui/core';

import IdeaCard, { type IdeaCardData } from './idea-card';

type Props = { cards: IdeaCardData[]; unreadable?: number; emptyAction?: boolean };

export default function IdeaList({ cards, unreadable = 0, emptyAction = false }: Props) {
  return (
    <FlexBox flexDirection="column" gap="12px">
      {unreadable > 0 && (
        <Typography variant="caption1" color="semantic.foreground.cautionary.primary">
          읽지 못한 파일 {unreadable}개 — idea.md 머리말을 확인해 주세요.
        </Typography>
      )}
      {cards.length === 0 ? (
        <FallbackView padding="compact">
          <FallbackViewContent>
            <FallbackViewText description="아직 아이디어가 없어요." />
          </FallbackViewContent>
          {emptyAction && (
            <FallbackViewActionArea variant="single">
              <FallbackViewActionAreaButton as={Link} href="/" variant="outlined" color="assistive">
                아이디어 쓰러 가기
              </FallbackViewActionAreaButton>
            </FallbackViewActionArea>
          )}
        </FallbackView>
      ) : (
        cards.map((c) => <IdeaCard key={c.id} {...c} />)
      )}
    </FlexBox>
  );
}
