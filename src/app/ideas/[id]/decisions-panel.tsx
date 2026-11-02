'use client';

import { useEffect, useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, List, ListCell, ListCellContent, ListCellLabelTrailing, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import DecisionForm from './decision-form';

import type { Decision } from '@/lib/storage';
import type { Summary } from '@/lib/summary';
import type { DecisionState } from '../../actions';

type Props = {
  decisions: Summary['decisions'];
  saveDecision: (decisionId: string | null, prev: DecisionState, formData: FormData) => Promise<DecisionState>;
  removeDecision: (decisionId: string) => Promise<void>;
  disabled: boolean;
  /** 확인 질문 탭에 폼이 열려 있으면 버튼을 숨긴다 (폼은 화면 전체에서 하나) */
  locked: boolean;
  /** 폼을 열고 닫을 때 위에 알린다 */
  onForm: (open: boolean) => void;
};

type Opening = { kind: 'plan'; question: string } | { kind: 'edit'; id: string } | { kind: 'new' } | null;

const text = (t: React.ReactNode) => (
  <Typography as="p" variant="body2" sx={{ display: 'block' }}>
    {t}
  </Typography>
);

const sub = (t: string) => (
  <Typography as="h3" variant="label1" weight="bold" sx={{ display: 'block', marginBottom: '4px' }}>
    {t}
  </Typography>
);

type RowProps = { label: string; description?: string; badge?: string; actions: React.ReactNode; below: React.ReactNode };

// 한 줄: 질문, 아래에 결정 값과 이유, 오른쪽에 버튼. 폼은 그 줄 아래에 (ListCell 안에 넣으면 눌림 효과 층이 폼을 덮는다)
function Row({ label, description, badge, actions, below }: RowProps) {
  return (
    <Box as="li">
      <ListCell
        as="div"
        disableInteraction
        verticalPadding="small"
        textProps={{ description }}
        labelTrailing={
          badge && (
            <ListCellLabelTrailing variant="content-badge">
              <ContentBadge size="xsmall" variant="outlined" color="neutral">
                {badge}
              </ContentBadge>
            </ListCellLabelTrailing>
          )
        }
        trailingContent={actions && <ListCellContent variant="custom">{actions}</ListCellContent>}
      >
        {label}
      </ListCell>
      {below}
    </Box>
  );
}

const detailOf = (d: Decision) => (d.status === 'decided' ? `${d.answer} (이유: ${d.reason})` : `보류 이유: ${d.reason}`);

/** 결정 탭 (spec detail-dashboard §2 탭 안) */
export default function DecisionsPanel({ decisions, saveDecision, removeDecision, disabled, locked, onForm }: Props) {
  const { open, openMore, recorded } = decisions;
  const hasDecisions = open.length > 0 || recorded.length > 0;
  const demo = useDemo();
  const [opening, setOpening] = useState<Opening>(null);
  const close = () => setOpening(null);
  // 두 패널은 force-mount라 사라지지 않는다. 조건부 렌더로 바꾸면 언마운트 때 onForm(false) 정리를 넣는다
  useEffect(() => onForm(opening !== null), [opening, onForm]);
  const canOpen = !demo && !locked && opening === null;
  const outlined = (label: string, onClick: () => void) => (
    <Button size="small" variant="outlined" color="assistive" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
  return (
    <FlexBox flexDirection="column" gap="20px">
      {!hasDecisions && text(demo ? '아직 남긴 결정이 없어요.' : '정할 게 생기면 여기에 남겨요.')}
      {open.length > 0 && (
        <Box>
          {sub(`아직 안 정한 것 (${open.length + openMore})`)}
          <List flexDirection="column">
            {open.map((q) => (
              <Row
                key={q}
                label={q}
                actions={canOpen && outlined('정하기', () => setOpening({ kind: 'plan', question: q }))}
                below={opening?.kind === 'plan' && opening.question === q && <DecisionForm question={q} action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />}
              />
            ))}
          </List>
          {openMore > 0 && text(`외 ${openMore}개`)}
        </Box>
      )}
      {recorded.length > 0 && (
        <Box>
          {sub(`정한 것과 보류한 것 (${recorded.length})`)}
          <List flexDirection="column">
            {recorded.map((d) => (
              <Row
                key={d.id}
                label={d.question}
                description={detailOf(d)}
                badge={d.status === 'deferred' ? '보류' : undefined}
                actions={
                  canOpen && (
                    <FlexBox gap="4px">
                      {outlined('수정', () => setOpening({ kind: 'edit', id: d.id }))}
                      <form
                        action={() => removeDecision(d.id)}
                        onSubmit={(e) => {
                          if (!window.confirm('이 결정을 지울까요? 이전 판은 .history에 남아요.')) e.preventDefault();
                        }}
                      >
                        <Button type="submit" size="small" variant="outlined" color="assistive" disabled={disabled}>
                          지우기
                        </Button>
                      </form>
                    </FlexBox>
                  )
                }
                below={opening?.kind === 'edit' && opening.id === d.id && <DecisionForm initial={d} action={saveDecision.bind(null, d.id)} onClose={close} disabled={disabled} />}
              />
            ))}
          </List>
        </Box>
      )}
      {!demo &&
        (opening?.kind === 'new' ? (
          <DecisionForm action={saveDecision.bind(null, null)} onClose={close} disabled={disabled} />
        ) : (
          canOpen && <Box>{outlined('결정 직접 추가', () => setOpening({ kind: 'new' }))}</Box>
        ))}
    </FlexBox>
  );
}
