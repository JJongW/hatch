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
import SectionTitle from '../_components/section-title';
import Panel from '@/components/panel';

import { formatCost, formatTokens, type Signal, type UsageSummary } from '@/lib/usage/summary';
import { highlightSx } from '@/lib/theme/tokens';

const SIGNAL_LABEL: Record<Signal, string> = { heavy: '비용 큼', loops: '여러 번 돎', redo: '다시 만들기 잦음', fails: '실패 있음' };
const sec = (ms: number) => `${Math.round(ms / 1000)}초`;
const NOWRAP = { whiteSpace: 'nowrap' } as const;
// 표 머리줄: Montage 회색 면 대신 흰 바탕 + 아래 1px 선 (#111. 회색은 선에만)
const HEAD = (t: Theme) => ({ backgroundColor: 'transparent', boxShadow: `inset 0 -1px 0 ${t.semantic.line.neutral.primary}` });
const NAME = { wordBreak: 'keep-all', minWidth: '120px' } as const;
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
    <Panel sx={{ flex: 1, minWidth: '140px' }}>
      <Typography variant="caption1" color="semantic.foreground.neutral.secondary">{label}</Typography>
      <Typography as="p" variant="title3" weight="bold" sx={{ margin: '4px 0 0' }}>{value}</Typography>
    </Panel>
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

          {/* 제목과 표를 한 묶음으로: 바깥 gap(20px)은 묶음 사이에만 */}
          <section>
            <SectionTitle flush>기능별</SectionTitle>
            <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead sx={HEAD}>
                <TableRow>
                  {['기능', '호출', '평균 시간', '평균 토큰', '평균 비용', '비중', '신호'].map((h) => <TableHeadCell key={h} sx={NOWRAP}>{h}</TableHeadCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {s.features.map((f) => (
                  <TableRow key={`${f.feature}:${f.key}`}>
                    <TableCell sx={NAME}>{labels[`${f.feature}:${f.key}`] ?? f.key}</TableCell>
                    <TableCell sx={NOWRAP}>{f.calls}번</TableCell>
                    <TableCell sx={NOWRAP}>{sec(f.avgMs)}</TableCell>
                    <TableCell sx={NOWRAP}>{f.avgTokens === null ? '없음' : formatTokens(f.avgTokens)}</TableCell>
                    <TableCell sx={NOWRAP}>{f.avgCost === null ? '없음' : formatCost(f.avgCost)}</TableCell>
                    <TableCell sx={NOWRAP}>{pct(f.costShare)}</TableCell>
                    <TableCell>
                      <FlexBox gap="4px" sx={{ flexWrap: 'wrap' }}>
                        {f.signals.map((sg) => (
                          <ContentBadge key={sg} sx={{ ...NOWRAP, ...highlightSx }} size="xsmall" variant="solid">
                            {sg === 'loops' ? `${SIGNAL_LABEL[sg]} ${f.loops}번` : SIGNAL_LABEL[sg]}
                          </ContentBadge>
                        ))}
                      </FlexBox>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </Box>
          </section>

          {!ideaFilter && s.ideas.length > 0 && (
            <section>
              <SectionTitle flush>아이디어별</SectionTitle>
              <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={HEAD}>
                  <TableRow>
                    {['아이디어', '호출', '토큰', '예상 비용'].map((h) => <TableHeadCell key={h} sx={NOWRAP}>{h}</TableHeadCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {s.ideas.map((i) => (
                    <TableRow key={i.ideaId}>
                      <TableCell sx={NAME}>
                        {titles[i.ideaId] ? (
                          <TextButton as={Link} href={`/ideas/${i.ideaId}`} size="small">{titles[i.ideaId]}</TextButton>
                        ) : (
                          '휴지통으로 보낸 아이디어'
                        )}
                      </TableCell>
                      <TableCell sx={NOWRAP}>{i.calls}번</TableCell>
                      <TableCell sx={NOWRAP}>{formatTokens(i.tokens)}</TableCell>
                      <TableCell sx={NOWRAP}>{formatCost(i.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </Box>
            </section>
          )}
        </>
      )}
    </FlexBox>
  );
}
