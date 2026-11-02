'use client';

import Link from 'next/link';
import {
  Box,
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
          읽지 못한 폴더 {unreadable}개 — 폴더 이름(id 형식)과 idea.md 머리말을 확인해 주세요.
        </Typography>
      )}
      {cards.length === 0 ? (
        // FallbackView는 폭이 고정(335px)이라 세로 FlexBox에서 왼쪽에 붙는다 → 가운데로
        <FallbackView padding="compact" sx={{ alignSelf: 'center' }}>
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
        // 위에서부터 차례로 나타난다. 10번째부터는 더 늦추지 않는다 (긴 목록이 굼떠 보이지 않게, spec motion §2)
        cards.map((c, i) => (
          <Box key={c.id} sx={{ animation: `hatch-rise 300ms ease-out ${Math.min(i, 9) * 30}ms both` }}>
            <IdeaCard {...c} />
          </Box>
        ))
      )}
    </FlexBox>
  );
}
