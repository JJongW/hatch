'use client';

import Link from 'next/link';
import {
  Box,
  ContentBadge,
  FlexBox,
  SectionMessage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextButton,
  Typography,
} from '@montage-ui/core';

import type { Theme } from '@montage-ui/core';

import PageHeader from '../_components/page-header';

import { formatCost, formatTokens, type Signal, type UsageSummary } from '@/lib/usage/summary';

const SIGNAL_LABEL: Record<Signal, string> = { heavy: '비용 큼', loops: '여러 번 돎', redo: '다시 만들기 잦음', fails: '실패 있음' };
const sec = (ms: number) => `${Math.round(ms / 1000)}초`;
const pct = (r: number) => `${Math.round(r * 100)}%`;

type Props = {
  summary: UsageSummary;
  labels: Record<string, string>;
  titles: Record<string, string>;
  ideaFilter: { id: string; title: string } | null;
  unreadable: number;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={(t: Theme) => ({ flex: 1, minWidth: '140px', padding: '16px', borderRadius: '12px', border: `1px solid ${t.semantic.line.neutral.primary}` })}>
      <Typography variant="caption1" color="semantic.foreground.neutral.secondary">{label}</Typography>
      <Typography as="p" variant="title3" weight="bold" sx={{ margin: '4px 0 0' }}>{value}</Typography>
    </Box>
  );
}

export default function UsageView({ summary, labels, titles, ideaFilter, unreadable }: Props) {
  const s = summary;
  return (
    <FlexBox flexDirection="column" gap="20px">
      <PageHeader
        title="사용량"
        description={ideaFilter ? `${ideaFilter.title}에 쓴 토큰과 비용이에요.` : '기능마다 토큰과 비용이 얼마나 드는지, 효율적으로 쓰고 있는지 봐요.'}
      />
      {ideaFilter && (
        <Box><TextButton as={Link} href="/usage" size="small" color="assistive">전체 보기</TextButton></Box>
      )}
      <SectionMessage variant="info">비용은 정가 기준 추정이에요. 구독으로 쓰면 실제로 청구되지 않아요.</SectionMessage>
      {unreadable > 0 && <SectionMessage variant="cautionary">읽지 못한 기록 {unreadable}줄은 빼고 계산했어요.</SectionMessage>}

      {s.calls === 0 ? (
        <Typography variant="body2" color="semantic.foreground.neutral.secondary">아직 기록이 없어요. 문서를 만들면 여기에 쌓여요.</Typography>
      ) : (
        <>
          <FlexBox gap="12px" sx={{ flexWrap: 'wrap' }}>
            <Stat label="호출" value={`${s.calls}번`} />
            <Stat label="토큰" value={formatTokens(s.tokens)} />
            <Stat label="예상 비용" value={formatCost(s.cost)} />
          </FlexBox>

          <Typography as="h2" variant="headline2" weight="bold">기능별</Typography>
          <Table>
            <TableHead>
              <TableRow>
                {['기능', '호출', '평균 시간', '평균 토큰', '평균 비용', '비중', '신호'].map((h) => <TableHeadCell key={h}>{h}</TableHeadCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {s.features.map((f) => (
                <TableRow key={`${f.feature}:${f.key}`}>
                  <TableCell>{labels[`${f.feature}:${f.key}`] ?? f.key}</TableCell>
                  <TableCell>{f.calls}번</TableCell>
                  <TableCell>{sec(f.avgMs)}</TableCell>
                  <TableCell>{f.avgTokens === null ? '없음' : formatTokens(f.avgTokens)}</TableCell>
                  <TableCell>{f.avgCost === null ? '없음' : formatCost(f.avgCost)}</TableCell>
                  <TableCell>{pct(f.costShare)}</TableCell>
                  <TableCell>
                    <FlexBox gap="4px" sx={{ flexWrap: 'wrap' }}>
                      {f.signals.map((sg) => (
                        <ContentBadge key={sg} size="xsmall" variant="outlined" color="accent" accentColor="semantic.foreground.cautionary.primary">
                          {sg === 'loops' ? `${SIGNAL_LABEL[sg]} ${f.loops}번` : SIGNAL_LABEL[sg]}
                        </ContentBadge>
                      ))}
                    </FlexBox>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!ideaFilter && s.ideas.length > 0 && (
            <>
              <Typography as="h2" variant="headline2" weight="bold">아이디어별</Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    {['아이디어', '호출', '토큰', '예상 비용'].map((h) => <TableHeadCell key={h}>{h}</TableHeadCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {s.ideas.map((i) => (
                    <TableRow key={i.ideaId}>
                      <TableCell>
                        {titles[i.ideaId] ? (
                          <TextButton as={Link} href={`/ideas/${i.ideaId}`} size="small">{titles[i.ideaId]}</TextButton>
                        ) : (
                          '휴지통으로 보낸 아이디어'
                        )}
                      </TableCell>
                      <TableCell>{i.calls}번</TableCell>
                      <TableCell>{formatTokens(i.tokens)}</TableCell>
                      <TableCell>{formatCost(i.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </>
      )}
    </FlexBox>
  );
}
