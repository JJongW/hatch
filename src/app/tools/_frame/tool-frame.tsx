'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useState } from 'react';
import {
  Box,
  Button,
  FlexBox,
  ListCell,
  Loading,
  Option,
  SectionMessage,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  TextArea,
  Typography,
} from '@montage-ui/core';

import DocMarkdown from '../../_components/doc-markdown';
import PageHeader from '../../_components/page-header';
import { useRefreshWhile } from '../../_components/use-refresh-while';

import type { Theme } from '@montage-ui/core';

import type { ToolActionState } from '../../actions';
import type { ToolFrameData } from './load';

type Props = ToolFrameData & {
  run: (prev: ToolActionState, fd: FormData) => Promise<ToolActionState>;
  /** 도구별 입력 칸. name이 프레임 칸(mode · ideaId · docKey · pasted · prevId) 밖이면 전부 도구 입력으로 간다 */
  inputFields?: React.ReactNode;
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

export default function ToolFrame({ tool, ideas, ideaId, none, results, current, busy, run, inputFields }: Props) {
  const router = useRouter();
  const base = `/tools/${tool.key}`;
  const urlMode: Mode = ideaId !== null ? 'idea' : none ? 'none' : 'pasted';
  const [mode, setMode] = useState<Mode>(urlMode);
  // 앞으로 · 뒤로 가기로 URL(아이디어 · ?source=none)이 바뀌면 모드를 맞춘다 (렌더 중 조정)
  const [seenMode, setSeenMode] = useState(urlMode);
  if (seenMode !== urlMode) {
    setSeenMode(urlMode);
    setMode(urlMode);
  }

  const hrefOf = (idea: string | null, result?: string) => {
    const q = new URLSearchParams();
    if (idea) q.set('idea', idea);
    else if (mode === 'none') q.set('source', 'none');
    if (result) q.set('result', result);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const [docKey, setDocKey] = useState('');
  const [pasted, setPasted] = useState('');

  const idea = ideas.find((i) => i.id === ideaId) ?? null;
  // 아이디어가 바뀌면 고른 문서가 목록에 없을 수 있다 → 첫 번째(도구 기본)로
  const selectedDoc = idea?.docs.some((d) => d.key === docKey) ? docKey : (idea?.docs[0]?.key ?? '');

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

  // <form action>은 성공 뒤 form.reset()을 부르고, Montage SegmentedControl · Select가 reset 이벤트에
  // 처음 값으로 돌아가며 onChange를 부른다 (모드 · 아이디어가 바뀌어 페이지 이동). 그래서 onSubmit에서 직접 보낸다.
  // 도구 입력 칸도 실행 뒤 그대로 남는다 (고친 판 다시 실행)
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(fd));
  };

  const changeMode = (v: string) => {
    const next: Mode = v === 'pasted' || v === 'none' ? v : 'idea';
    setMode(next);
    // 아이디어 탭은 아이디어를 고를 때 이동한다
    if (next === 'none' && urlMode !== 'none') router.push(`${base}?source=none`);
    if (next === 'pasted' && urlMode !== 'pasted') router.push(base);
  };

  return (
    <>
      <PageHeader title={tool.label} description={tool.description} />

      <form onSubmit={submit}>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="ideaId" value={mode === 'idea' ? (ideaId ?? '') : ''} />
        <input type="hidden" name="docKey" value={mode === 'idea' ? selectedDoc : ''} />

        <FlexBox flexDirection="column" gap="32px">
          <section>
            {sectionTitle('입력 문서')}
            <FlexBox flexDirection="column" gap="12px">
              <SegmentedControl value={mode} onValueChange={changeMode} size="medium">
                <SegmentedControlItem value="idea">아이디어 문서</SegmentedControlItem>
                <SegmentedControlItem value="pasted">직접 붙여넣기</SegmentedControlItem>
                {tool.sourceOptional && <SegmentedControlItem value="none">문서 없이</SegmentedControlItem>}
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
                      <SectionMessage variant="info">이 도구가 받는 문서({tool.acceptsLabels.join(' · ')})가 아직 없어요.</SectionMessage>
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
                    disabled={blocked}
                    aria-label="붙여넣을 문서"
                    placeholder="검토할 문서를 붙여넣어 주세요."
                  />
                  <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                    최대 30,000자 · {pasted.length.toLocaleString('ko-KR')}자
                  </Typography>
                </FlexBox>
              )}
            </FlexBox>
          </section>

          {inputFields && (
            <section>
              {sectionTitle('도구 입력')}
              <fieldset disabled={blocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                {inputFields}
              </fieldset>
            </section>
          )}

          <FlexBox flexDirection="column" gap="12px">
            <FlexBox alignItems="center" gap="12px" flexWrap="wrap">
              <Button type="submit" disabled={blocked || noSource}>
                실행
              </Button>
              {pending && (
                <FlexBox alignItems="center" gap="8px">
                  <Loading variant="circular" size={20} />
                  <Typography variant="body2">{tool.runningLabel}</Typography>
                </FlexBox>
              )}
              {otherBusy && (
                <Typography variant="body2" color="semantic.foreground.neutral.secondary">
                  다른 문서를 만드는 중이에요. 끝나면 실행할 수 있어요.
                </Typography>
              )}
            </FlexBox>
            {state.error && !pending && <SectionMessage variant="negative">{state.error}</SectionMessage>}
          </FlexBox>

          {showResults && current && (
            <section>
              {sectionTitle('결과')}
              <Box sx={resultBoxStyle}>
                <Typography as="div" variant="body2">
                  <DocMarkdown>{current.body}</DocMarkdown>
                </Typography>
                {tool.continueLabel && (
                  <FlexBox justifyContent="flex-end" sx={{ marginTop: '12px' }}>
                    <Button type="submit" name="prevId" value={current.id} variant="outlined" color="assistive" size="small" disabled={blocked || noSource}>
                      {tool.continueLabel}
                    </Button>
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
