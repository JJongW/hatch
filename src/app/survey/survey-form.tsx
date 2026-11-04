'use client';

import { useActionState, useEffect, useState } from 'react';
import { Box, Button, Chip, FlexBox, SectionMessage, TextArea, TextField, Typography, type Theme } from '@montage-ui/core';

import { MAX_LONG, MAX_SHORT, QUESTIONS, SECTIONS, type Question } from '@/lib/survey/questions';
import { hatchColor } from '@/lib/theme/tokens';

import SectionTitle from '../_components/section-title';

import type { SurveyState } from './actions';

type Answers = Record<string, unknown>;
type Props = { ready: boolean; action: (prev: SurveyState, formData: FormData) => Promise<SurveyState> };

const REQUIRED_IDS = QUESTIONS.filter((q) => q.required).map((q) => q.id);

const isAnswered = (q: Question, v: unknown) => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (q.type === 'grid') return Object.keys(v as object).length === q.rows.length;
  return true;
};

// 선택지 칩. 휴대폰에서도 누르기 쉽게 large (medium은 36px라 권장 44px보다 작다)
function Choice({ label, selected, multi, onClick }: { label: string; selected: boolean; multi?: boolean; onClick: () => void }) {
  return (
    <Chip type="button" size="large" variant="outlined" active={selected} role={multi ? 'checkbox' : 'radio'} aria-checked={selected} onClick={onClick}>
      {label}
    </Chip>
  );
}

function Choices({ label, options, value, onPick }: { label: string; options: readonly string[]; value: unknown; onPick: (o: string) => void }) {
  return (
    <FlexBox gap="8px" role="radiogroup" aria-label={label} sx={{ flexWrap: 'wrap' }}>
      {options.map((o) => (
        <Choice key={o} label={o} selected={value === o} onClick={() => onPick(o)} />
      ))}
    </FlexBox>
  );
}

// set은 값 또는 이전 값을 받는 함수. 여러 칸을 빠르게 연달아 눌러도 앞의 답이 덮이지 않게 함수로 고친다
type SetAnswer = (v: unknown | ((prev: unknown) => unknown)) => void;

function Field({ q, value, set }: { q: Question; value: unknown; set: SetAnswer }) {
  switch (q.type) {
    case 'single':
      return <Choices label={q.label} options={q.options} value={value} onPick={set} />;
    case 'multi': {
      const picked = (value as string[] | undefined) ?? [];
      return (
        <FlexBox gap="8px" role="group" aria-label={q.label} sx={{ flexWrap: 'wrap' }}>
          {q.options.map((o) => (
            <Choice key={o} label={o} multi selected={picked.includes(o)} onClick={() => set((prev: unknown) => { const cur = (prev as string[] | undefined) ?? []; return cur.includes(o) ? cur.filter((p) => p !== o) : [...cur, o]; })} />
          ))}
        </FlexBox>
      );
    }
    case 'scale': {
      const nums = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i);
      return (
        <FlexBox flexDirection="column" gap="6px">
          <FlexBox gap="8px" role="radiogroup" aria-label={q.label} sx={{ flexWrap: 'wrap' }}>
            {nums.map((n) => (
              <Choice key={n} label={String(n)} selected={value === n} onClick={() => set(n)} />
            ))}
          </FlexBox>
          <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
            {q.min} {q.minLabel}, {q.max} {q.maxLabel}
          </Typography>
        </FlexBox>
      );
    }
    case 'grid': {
      const rows = (value as Record<string, string> | undefined) ?? {};
      return (
        <FlexBox flexDirection="column" gap="16px">
          {q.rows.map((row, i) => (
            <FlexBox key={row} flexDirection="column" gap="8px">
              <Typography variant="body2" weight="medium">
                {i + 1}. {row}
              </Typography>
              <Choices label={`${q.label}: ${row}`} options={q.options} value={rows[String(i)]} onPick={(o) => set((prev: unknown) => ({ ...(prev as Record<string, string> | undefined), [String(i)]: o }))} />
            </FlexBox>
          ))}
        </FlexBox>
      );
    }
    case 'short':
      return <TextField value={(value as string) ?? ''} onChange={(e) => set(e.target.value)} maxLength={MAX_SHORT} aria-label={q.label} width="100%" />;
    case 'long':
      return <TextArea value={(value as string) ?? ''} onChange={(e) => set(e.target.value)} maxLength={MAX_LONG} minRows={3} aria-label={q.label} width="100%" />;
  }
}

export default function SurveyForm({ ready, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [answers, setAnswers] = useState<Answers>({});
  // 서버가 돌려준 오류 중 그 뒤에 답을 고친 문항은 지운다. 고친 목록은 그 제출 결과(state)에 묶여, 다시 제출하면 비워진다
  const [fixed, setFixed] = useState<{ of: SurveyState; ids: Set<string> }>({ of: state, ids: new Set() });
  const fixedIds = fixed.of === state ? fixed.ids : new Set<string>();
  const errors = Object.fromEntries(Object.entries(state.fieldErrors ?? {}).filter(([id]) => !fixedIds.has(id)));

  // 제출이 막히면 첫 오류 문항으로 옮겨 준다
  useEffect(() => {
    const first = QUESTIONS.find((q) => state.fieldErrors?.[q.id]);
    if (first) document.getElementById(`q-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [state]);

  const set = (id: string): SetAnswer => (v) => {
    setAnswers((a) => ({ ...a, [id]: typeof v === 'function' ? v(a[id]) : v }));
    setFixed((f) => ({ of: state, ids: new Set(f.of === state ? f.ids : []).add(id) }));
  };
  const done = REQUIRED_IDS.filter((id) => isAnswered(QUESTIONS.find((q) => q.id === id)!, answers[id])).length;

  return (
    <form action={formAction}>
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />
      <FlexBox flexDirection="column" gap="40px">
        {!ready && <SectionMessage variant="cautionary">설문 저장소가 연결되지 않았어요. 진행자에게 알려 주세요.</SectionMessage>}
        {SECTIONS.map((s, si) => (
          <FlexBox as="section" key={s.title} flexDirection="column" gap="24px" aria-labelledby={`s-${si}`}>
            {/* 제목 아래 여백(12px)이 설명과의 간격 */}
            <FlexBox flexDirection="column">
              <SectionTitle id={`s-${si}`} flush>
                {si + 1}. {s.title}
              </SectionTitle>
              {s.description && (
                <Typography variant="body2" color="semantic.foreground.neutral.secondary">
                  {s.description}
                </Typography>
              )}
            </FlexBox>
            {s.questions.map((q) => (
              // 문항 하나 = 그룹 하나. 제목과 오류 문구를 화면 읽기 프로그램에도 묶어 준다
              <FlexBox
                key={q.id}
                id={`q-${q.id}`}
                flexDirection="column"
                gap="10px"
                role="group"
                aria-labelledby={`q-${q.id}-label`}
                aria-describedby={errors[q.id] ? `q-${q.id}-error` : undefined}
              >
                <Typography id={`q-${q.id}-label`} as="p" variant="body1" weight="bold" sx={{ margin: 0 }}>
                  {q.label}
                  {q.required ? (
                    <Typography as="span" variant="body1" sx={{ color: hatchColor.highlight.mark }} aria-label="필수">
                      {' '}*
                    </Typography>
                  ) : (
                    <Typography as="span" variant="caption1" color="semantic.foreground.neutral.secondary">
                      {' '}선택
                    </Typography>
                  )}
                </Typography>
                <Field q={q} value={answers[q.id]} set={set(q.id)} />
                {errors[q.id] && (
                  <Typography id={`q-${q.id}-error`} variant="caption1" color="semantic.foreground.negative.primary" role="alert">
                    {errors[q.id]}
                  </Typography>
                )}
              </FlexBox>
            ))}
          </FlexBox>
        ))}
        <Box sx={(t: Theme) => ({ position: 'sticky', bottom: 0, paddingBlock: '12px', background: t.semantic.background.neutral.primary })}>
          <FlexBox flexDirection="column" gap="8px">
            {state.error && <SectionMessage variant="negative">{state.error}</SectionMessage>}
            <Typography variant="caption1" color="semantic.foreground.neutral.secondary">
              필수 {REQUIRED_IDS.length}개 중 {done}개 답함
            </Typography>
            <Button type="submit" size="large" fullWidth loading={pending} disabled={!ready}>
              제출하기
            </Button>
          </FlexBox>
        </Box>
      </FlexBox>
    </form>
  );
}
