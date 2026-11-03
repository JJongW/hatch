'use client';

import { FlexBox, FormControl, FormControlField, FormControlLabel, FormControlMessage, TextField, TextFieldContent } from '@montage-ui/core';

const FIELDS = [
  { name: 'baselineRate', label: '기준 전환율', unit: '%', placeholder: '예: 10', hint: '지금 주요 지표의 전환율' },
  { name: 'minEffect', label: '최소 감지 효과', unit: '%', placeholder: '예: 10', hint: '상대 변화 (10% → 11%면 10)' },
  { name: 'dailyTraffic', label: '하루 실험 대상 수', unit: '명', placeholder: '예: 1000', hint: '실험에 들어올 하루 사용자 수' },
] as const;

/** 모두 선택. 비우면 표본 · 기간 대신 [확인 필요]로 남는다. shown: 데모에서 보는 결과의 입력 (읽기 전용, 비었으면 빈 칸) */
export default function MetricsInputs({ shown }: { shown?: Partial<Record<(typeof FIELDS)[number]['name'], number | null>> }) {
  return (
    <FlexBox gap="16px" flexWrap="wrap">
      {FIELDS.map((f) => (
        <FormControl key={f.name} sx={{ flex: '1 1 200px' }}>
          <FormControlLabel>{f.label} (선택)</FormControlLabel>
          <FormControlField>
            <TextField
              name={f.name}
              inputMode="decimal"
              placeholder={shown ? '입력 안 함' : f.placeholder}
              {...(shown && { value: shown[f.name] === null || shown[f.name] === undefined ? '' : String(shown[f.name]), readOnly: true })}
              trailingContent={<TextFieldContent variant="text">{f.unit}</TextFieldContent>}
              width="100%"
            />
          </FormControlField>
          <FormControlMessage>{f.hint}</FormControlMessage>
        </FormControl>
      ))}
    </FlexBox>
  );
}
