'use client';

import { useEffect, useState } from 'react';
import { Box, Button, ContentBadge, FlexBox, List, ListCell, ListCellContent, ListCellLabelTrailing, Typography } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import { useConfirmSubmit } from '../../_components/use-confirm-submit';
import DecisionForm from './decision-form';

import type { Decision, Evidence } from '@/lib/storage';
import type { Summary } from '@/lib/summary';
import type { DecisionState } from '../../actions';

type Props = {
  decisions: Summary['decisions'];
  /** 결정에 연결된 근거를 보여 줄 때 쓴다 */
  evidence?: Evidence[];
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
        // ListCell은 줄 안 클릭을 첫 버튼(수정)으로 넘긴다. 버튼끼리는 넘기지 않게 여기서 멈춘다 (지우기를 누르면 수정 폼도 열렸음)
        trailingContent={
          actions && (
            <ListCellContent variant="custom" onClick={(e) => e.stopPropagation()}>
              {actions}
            </ListCellContent>
          )
        }
      >
        {label}
      </ListCell>
      {below}
    </Box>
  );
}

const BADGE: Record<Decision['status'], string | undefined> = { decided: undefined, deferred: '보류', proposed: '제안' };

/** 결정 값 · 이유, 연결된 근거가 있으면 그 내용까지 (지워진 근거 id는 건너뛴다) */
function detailOf(d: Decision, evidence: Map<string, Evidence>) {
  const main = d.status === 'deferred' ? `보류 이유: ${d.reason}` : `${d.status === 'proposed' ? '제안: ' : ''}${d.answer} (이유: ${d.reason})`;
  const linked = (d.evidenceIds ?? []).flatMap((id) => evidence.get(id)?.text ?? []);
  return linked.length ? `${main} · 근거: ${linked.join(' / ')}` : main;
}

/** 결정 탭 (spec detail-dashboard §2 탭 안) */
export default function DecisionsPanel({ decisions, evidence = [], saveDecision, removeDecision, disabled, locked, onForm }: Props) {
  const { open, openMore, recorded } = decisions;
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const hasDecisions = open.length > 0 || recorded.length > 0;
  const demo = useDemo();
  const [opening, setOpening] = useState<Opening>(null);
  const close = () => setOpening(null);
  const ask = useConfirmSubmit();
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
          {sub(`남긴 결정 (${recorded.length})`)}
          <List flexDirection="column">
            {recorded.map((d) => (
              <Row
                key={d.id}
                label={d.question}
                description={detailOf(d, byId)}
                badge={BADGE[d.status]}
                actions={
                  canOpen && (
                    <FlexBox gap="4px">
                      {outlined('수정', () => setOpening({ kind: 'edit', id: d.id }))}
                      <form
                        action={() => removeDecision(d.id)}
                        onSubmit={ask({ title: '이 결정을 지울까요?', content: '지워도 이전 버전은 남아요.', confirm: '지우기', negative: true })}
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
