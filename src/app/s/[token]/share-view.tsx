'use client';

import { useState } from 'react';
import { Box, FlexBox, SectionMessage, Tab, TabList, TabListItem, TabPanel, Typography } from '@montage-ui/core';

import type { SharePayload } from '@/lib/share/payload';

import DocMarkdown from '../../_components/doc-markdown';
import FocusPage from '../../_components/focus-page';

// 읽기 전용: 버튼, 폼, Server Action이 없다. 받은 글을 그리기만 한다
const PANEL = { paddingTop: '20px' };

function Closed() {
  return (
    <FlexBox flexDirection="column" gap="8px" sx={{ paddingTop: '40px' }}>
      <Typography variant="title3" weight="bold">
        공유가 끝난 링크예요.
      </Typography>
      <Typography variant="body1" color="semantic.foreground.neutral.secondary">
        링크를 보낸 사람에게 새 링크를 받아 주세요.
      </Typography>
    </FlexBox>
  );
}

const label = (text: string) => (
  <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.secondary">
    {text}
  </Typography>
);

export default function ShareView({ payload }: { payload: SharePayload | null }) {
  const [section, setSection] = useState('docs');
  if (!payload) {
    return (
      <>
        <FocusPage wide />
        <Closed />
      </>
    );
  }
  const groups = [...new Set(payload.questions.map((q) => q.group))];
  return (
    <>
      <FocusPage wide />
      <FlexBox flexDirection="column" gap="16px">
        <SectionMessage variant="info">PO가 공유한 시점의 읽기 전용 사본이에요. 링크가 있는 사람은 누구나 볼 수 있어요.</SectionMessage>
        <FlexBox flexDirection="column" gap="4px">
          <Typography as="h1" variant="title2" weight="bold">
            {payload.title}
          </Typography>
          {payload.memo && (
            <Typography variant="body1" color="semantic.foreground.neutral.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {payload.memo}
            </Typography>
          )}
        </FlexBox>
        {payload.context.length > 0 && (
          <Box as="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px', margin: 0 }}>
            {payload.context.map((c, i) => (
              <Box key={i} sx={{ display: 'contents' }}>
                <Typography as="dt" variant="label1" color="semantic.foreground.neutral.secondary">
                  {c.label}
                </Typography>
                <Typography as="dd" variant="label1" sx={{ margin: 0 }}>
                  {c.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        <Tab value={section} onValueChange={setSection}>
          <TabList size="medium" resize="hug">
            <TabListItem value="docs">{`문서 ${payload.docs.length}`}</TabListItem>
            <TabListItem value="questions">{`확인 질문 ${payload.questions.length}`}</TabListItem>
            <TabListItem value="decisions">{`결정 ${payload.decisions.length}`}</TabListItem>
          </TabList>
          <TabPanel value="docs" sx={PANEL}>
            {payload.docs.length === 0 && <Typography variant="body1">공유한 문서가 없어요.</Typography>}
            <FlexBox flexDirection="column" gap="40px">
              {payload.docs.map((d, i) => (
                <Box as="section" key={i} aria-label={d.label}>
                  <Box sx={{ marginBottom: '12px' }}>{label(d.label)}</Box>
                  <DocMarkdown images="hide">{d.content}</DocMarkdown>
                </Box>
              ))}
            </FlexBox>
          </TabPanel>
          <TabPanel value="questions" sx={PANEL}>
            {groups.length === 0 && <Typography variant="body1">공유한 질문이 없어요.</Typography>}
            <FlexBox flexDirection="column" gap="24px">
              {groups.map((g) => (
                <FlexBox key={g} flexDirection="column" gap="8px">
                  {label(g)}
                  <Box as="ul" sx={{ margin: 0, paddingLeft: '20px' }}>
                    {payload.questions
                      .filter((q) => q.group === g)
                      .map((q, i) => (
                        <Typography as="li" key={i} variant="body2" sx={{ display: 'list-item', marginBottom: '4px' }}>
                          {q.question}
                        </Typography>
                      ))}
                  </Box>
                </FlexBox>
              ))}
            </FlexBox>
          </TabPanel>
          <TabPanel value="decisions" sx={PANEL}>
            {payload.decisions.length === 0 && <Typography variant="body1">공유한 결정이 없어요.</Typography>}
            <FlexBox flexDirection="column" gap="16px">
              {payload.decisions.map((d, i) => (
                <FlexBox key={i} flexDirection="column" gap="2px">
                  <Typography variant="body1" weight="bold">
                    {d.question}
                  </Typography>
                  <Typography variant="body2">{d.status === 'decided' ? d.answer : '보류'}</Typography>
                  {d.reason && (
                    <Typography variant="label1" color="semantic.foreground.neutral.secondary">
                      {d.reason}
                    </Typography>
                  )}
                </FlexBox>
              ))}
            </FlexBox>
          </TabPanel>
        </Tab>
      </FlexBox>
    </>
  );
}
