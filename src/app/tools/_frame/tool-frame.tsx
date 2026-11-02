'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useState } from 'react';
import {
  Box,
  Button,
  FlexBox,
  ListCell,
  Option,
  SectionMessage,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  TextArea,
  Typography,
} from '@montage-ui/core';

import { UseLocallyButton, useDemo } from '../../_components/demo';
import DocMarkdown from '../../_components/doc-markdown';
import PageHeader from '../../_components/page-header';
import RunningNote from '../../_components/running-note';
import { useRefreshWhile } from '../../_components/use-refresh-while';

import { DEMO_SAMPLE_IDEA } from '@/lib/demo';

import type { Theme } from '@montage-ui/core';

import type { ToolActionState } from '../../actions';
import type { ToolFrameData } from './load';

type Props = ToolFrameData & {
  run: (prev: ToolActionState, fd: FormData) => Promise<ToolActionState>;
  /** 도구별 입력 칸. name이 프레임 칸(mode · ideaId · docKey · pasted · prevId) 밖이면 전부 도구 입력으로 간다 */
  inputFields?: React.ReactNode;
  /** 결과 상자 안 이어 실행 입력 (협상 내 답). 이어 실행 버튼과 같은 조건에서 보인다 */
  continueFields?: React.ReactNode;
  /** 결과 상자 맨 위, 마크다운 위에 놓는 화면 전용 요약 (재리뷰 비교, VOC 거르기). 페이지가 current.data로 만든다.
   *  그릴 게 없으면 null을 넘긴다. 상태가 있는 요약은 'use client' 컴포넌트에 data(JSON)만 props로 */
  resultSummary?: React.ReactNode;
};

type Mode = 'idea' | 'pasted' | 'none';

const sectionTitle = (text: string) => (
  <Typography as="h2" variant="headline2" weight="bold" sx={{ display: 'block', marginBottom: '12px' }}>
    {text}
  </Typography>
);

const resultBoxStyle = (theme: Theme) => ({
  border: `1px solid ${theme.semantic.line.neutral.primary}`,
  borderRadius: '12px',
  padding: '16px',
});

export default function ToolFrame({ tool, ideas, ideaId, none, results, current, busy, run, inputFields, continueFields, resultSummary }: Props) {
  const router = useRouter();
  const demo = useDemo();
  const base = `/tools/${tool.key}`;
  const urlMode: Mode = ideaId !== null ? 'idea' : none ? 'none' : 'pasted';
  const [mode, setMode] = useState<Mode>(urlMode);
  // 앞으로 · 뒤로 가기로 URL이 바뀌면 모드를 맞춘다 (렌더 중 조정). sourceOptional tools: param 없음 = 문서 없이, ?source=pasted = 붙여넣기
  const [seenMode, setSeenMode] = useState(urlMode);
  if (seenMode !== urlMode) {
    setSeenMode(urlMode);
    setMode(urlMode);
  }

  const hrefOf = (idea: string | null, result?: string) => {
    const q = new URLSearchParams();
    if (idea) q.set('idea', idea);
    // 'none' 모드는 sourceOptional 도구에만 있고, 그 기본이 문서 없이라 param이 없다
    else if (mode === 'pasted' && tool.sourceOptional) q.set('source', 'pasted');
    if (result) q.set('result', result);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const [docKey, setDocKey] = useState('');
  const [pasted, setPasted] = useState('');

  const idea = ideas.find((i) => i.id === ideaId) ?? null;
  // 아이디어가 바뀌면 고른 문서가 목록에 없을 수 있다 → 첫 번째(도구 기본)로
  const selectedDoc = idea?.docs.some((d) => d.key === docKey) ? docKey : (idea?.docs[0]?.key ?? '');

  // 어느 버튼으로 보냈는지: 이어 실행(name=prevId)이면 진행 · 오류를 그 버튼 옆에 보인다
  const [continued, setContinued] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ToolActionState, fd: FormData) => {
    const next = await run(prev, fd);
    if (next.resultId) router.push(hrefOf(next.ideaId ?? null, next.resultId));
    return next;
  }, {});

  // 다른 탭 · 문서 생성이 claude를 쓰는 중이면 끝날 때까지 3초마다 다시 받는다
  const otherBusy = busy && !pending;
  useRefreshWhile(otherBusy);
  const blocked = pending || otherBusy;
  const noSource = mode === 'idea' && !selectedDoc; // 아이디어 · 문서를 아직 안 골랐다
  // 받은 결과가 지금 탭의 것일 때만 보인다 (아이디어를 고르기 전 · 탭을 바꿔 이동하는 중엔 숨긴다)
  const showResults = mode === urlMode;
  const continueVisible = showResults && !!current && !!tool.continueLabel && !demo;
  // 이어 실행 영역이 안 보이면(결과가 사라진 경우) 위쪽에 보인다
  const inContinue = continued && continueVisible;
  const statusNode = (
    <>
      {pending && <RunningNote label={tool.runningLabel} steps={tool.runningSteps} />}
    </>
  );
  const errorNode = state.error && !pending ? <SectionMessage variant="negative">{state.error}</SectionMessage> : null;

  // <form action>은 성공 뒤 form.reset()을 부르고, Montage SegmentedControl · Select가 reset 이벤트에
  // 처음 값으로 돌아가며 onChange를 부른다 (모드 · 아이디어가 바뀌어 페이지 이동). 그래서 onSubmit에서 직접 보낸다.
  // 도구 입력 칸도 실행 뒤 그대로 남는다 (고친 판 다시 실행)
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    setContinued((submitter as HTMLButtonElement | null)?.name === 'prevId');
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => action(fd));
  };

  const changeMode = (v: string) => {
    const next: Mode = v === 'pasted' || v === 'none' ? v : 'idea';
    setMode(next);
    // 아이디어 탭은 아이디어를 고를 때 이동한다
    // 'none' 모드는 sourceOptional 도구에만 있으므로 base가 곧 문서 없이다
    if (next === 'none' && urlMode !== 'none') router.push(base);
    if (next === 'pasted' && urlMode !== 'pasted') router.push(tool.sourceOptional ? `${base}?source=pasted` : base);
  };

  const sourceSection = (
    <section>
      {sectionTitle(tool.sourceOptional ? '제품 맥락 (선택)' : '입력 문서')}
      <FlexBox flexDirection="column" gap="12px">
        <SegmentedControl value={mode} onValueChange={changeMode} size="medium">
          {/* 실행 중 탭을 바꾸면 결과 링크(hrefOf)가 다른 탭 것이 된다 → 실행 중엔 막는다 */}
          <SegmentedControlItem value="idea" disabled={blocked}>
            아이디어 문서
          </SegmentedControlItem>
          <SegmentedControlItem value="pasted" disabled={blocked}>
            직접 붙여넣기
          </SegmentedControlItem>
          {tool.sourceOptional && (
            <SegmentedControlItem value="none" disabled={blocked}>
              문서 없이
            </SegmentedControlItem>
          )}
        </SegmentedControl>

        {mode === 'idea' ? (
          <FlexBox flexDirection="column" gap="12px">
            <Select
              value={ideaId ?? ''}
              placeholder={ideas.length ? '아이디어를 골라 주세요' : '아직 아이디어가 없어요'}
              // 같은 값 · 빈 값으로 불려도 이동하지 않는다
              onChange={(id) => id && id !== ideaId && router.push(hrefOf(id))}
              disabled={blocked || ideas.length === 0}
              width="100%"
              aria-label="아이디어"
            >
              {ideas.map((i) => (
                <Option key={i.id} value={i.id}>
                  {i.title}
                </Option>
              ))}
            </Select>
            {idea &&
              (idea.docs.length === 0 ? (
                <SectionMessage variant="info">이 도구가 받는 문서({tool.acceptsLabels.join(', ')})가 아직 없어요.</SectionMessage>
              ) : (
                <Select value={selectedDoc} onChange={(k) => k && setDocKey(k)} disabled={blocked} width="100%" aria-label="문서">
                  {idea.docs.map((d) => (
                    <Option key={d.key} value={d.key}>
                      {d.label}
                    </Option>
                  ))}
                </Select>
              ))}
          </FlexBox>
        ) : mode === 'none' ? (
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">
            입력 문서 없이 실행해요.
          </Typography>
        ) : (
          <FlexBox flexDirection="column" gap="4px">
            <TextArea
              name="pasted"
              value={pasted}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPasted(e.target.value)}
              minRows={10}
              maxRows={20}
              width="100%"
              disabled={blocked || demo}
              aria-label="붙여넣을 문서"
              placeholder="검토할 문서를 붙여넣어 주세요."
            />
            <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
              {pasted.length.toLocaleString('ko-KR')}자 / 최대 30,000자
            </Typography>
          </FlexBox>
        )}
      </FlexBox>
    </section>
  );
  const inputSection = inputFields && (
    <section>
      {sectionTitle(tool.inputLabel)}
      <fieldset disabled={blocked || demo} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {inputFields}
      </fieldset>
    </section>
  );

  return (
    <>
      <PageHeader title={tool.label} description={tool.description} />

      {/* 데모는 실행을 못 하니, 할 수 있는 일(샘플 결과 보기)을 맨 위에 둔다 */}
      {demo && !current && (
        <Box sx={{ marginBottom: '32px' }}>
          <SectionMessage variant="info">데모에서는 실행할 수 없어요. 샘플 아이디어로 미리 만든 결과를 볼 수 있어요.</SectionMessage>
          <FlexBox gap="8px" flexWrap="wrap" sx={{ marginTop: '12px' }}>
            <Button as={Link} href={`${base}?idea=${DEMO_SAMPLE_IDEA}`}>
              샘플 결과 보기
            </Button>
            <UseLocallyButton />
          </FlexBox>
        </Box>
      )}

      <form onSubmit={submit}>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="ideaId" value={mode === 'idea' ? (ideaId ?? '') : ''} />
        <input type="hidden" name="docKey" value={mode === 'idea' ? selectedDoc : ''} />

        <FlexBox flexDirection="column" gap="32px">
          {/* 입력이 주인공인 도구(VOC)는 입력 먼저, 문서가 주인공인 도구는 문서 먼저 */}
          {tool.sourceOptional ? (
            <>
              {inputSection}
              {sourceSection}
            </>
          ) : (
            <>
              {sourceSection}
              {inputSection}
            </>
          )}

          <FlexBox flexDirection="column" gap="12px">
            <FlexBox alignItems="center" gap="12px" flexWrap="wrap">
              {demo ? (
                <UseLocallyButton />
              ) : (
                <Button type="submit" disabled={blocked || noSource}>
                  실행
                </Button>
              )}
              {!inContinue && statusNode}
              {otherBusy && (
                <Typography variant="body2" color="semantic.foreground.neutral.secondary">
                  다른 문서를 만드는 중이에요. 끝나면 실행할 수 있어요.
                </Typography>
              )}
            </FlexBox>
            {!inContinue && errorNode}
          </FlexBox>

          {showResults && current && (
            <section>
              {sectionTitle('결과')}
              <Box sx={resultBoxStyle}>
                {resultSummary && <Box sx={{ marginBottom: '16px' }}>{resultSummary}</Box>}
                <Typography as="div" variant="body2">
                  <DocMarkdown>{current.body}</DocMarkdown>
                </Typography>
                {continueVisible && (
                  <FlexBox flexDirection="column" gap="12px" sx={{ marginTop: '12px' }}>
                    {continueFields && (
                      <fieldset disabled={blocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                        {continueFields}
                      </fieldset>
                    )}
                    {inContinue && errorNode}
                    <FlexBox justifyContent="flex-end" alignItems="center" gap="12px">
                      {inContinue && statusNode}
                      <Button type="submit" name="prevId" value={current.id} variant="outlined" color="assistive" size="small" disabled={blocked || noSource}>
                        {tool.continueLabel}
                      </Button>
                    </FlexBox>
                  </FlexBox>
                )}
              </Box>
            </section>
          )}

          {showResults && results.length > 0 && (
            <section>
              {sectionTitle('지난 결과')}
              <FlexBox flexDirection="column">
                {results.map((r) => (
                  <ListCell
                    key={r.id}
                    as={Link}
                    href={hrefOf(ideaId, r.id)}
                    selected={r.id === current?.id}
                    verticalPadding="small"
                    textProps={{ description: r.source }}
                  >
                    {r.createdAt}
                  </ListCell>
                ))}
              </FlexBox>
            </section>
          )}
        </FlexBox>
      </form>
    </>
  );
}
