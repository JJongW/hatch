'use client';

import { FlexBox, FormControl, FormControlLabel, FormControlMessage, TextField, TextFieldContent } from '@montage-ui/core';

const FIELDS = [
  { name: 'baselineRate', label: '기준 전환율', unit: '%', placeholder: '예: 10', hint: '지금 주요 지표의 전환율' },
  { name: 'minEffect', label: '최소 감지 효과', unit: '%', placeholder: '예: 10', hint: '상대 변화 (10% → 11%면 10)' },
  { name: 'dailyTraffic', label: '하루 실험 대상 수', unit: '명', placeholder: '예: 1000', hint: '실험에 들어올 하루 사용자 수' },
] as const;

/** 모두 선택. 비우면 표본 · 기간 대신 [확인 필요]로 남는다 */
export default function MetricsInputs() {
  return (
    <FlexBox gap="16px" flexWrap="wrap">
      {FIELDS.map((f) => (
        <FormControl key={f.name} sx={{ flex: '1 1 200px' }}>
          <FormControlLabel>{f.label} (선택)</FormControlLabel>
          <TextField
            name={f.name}
            inputMode="decimal"
            placeholder={f.placeholder}
            trailingContent={<TextFieldContent variant="text">{f.unit}</TextFieldContent>}
            width="100%"
          />
          <FormControlMessage>{f.hint}</FormControlMessage>
        </FormControl>
      ))}
    </FlexBox>
  );
}
