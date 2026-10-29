'use client';

import { useState } from 'react';
import { Box, Button, FlexBox } from '@montage-ui/core';

import { useDemo } from '../../_components/demo';
import IdeaForm from '../../_components/idea-form';
import PageHeader from '../../_components/page-header';
import SectionTitle from '../../_components/section-title';
import { useRefreshWhile } from '../../_components/use-refresh-while';

import DocCard from './doc-card';
import DocTabs, { firstTab } from './doc-tabs';
import IdeaSummary from './idea-summary';

import type { Doc, DocKey } from '@/lib/storage';
import type { Summary } from '@/lib/summary';
import type { DocActionState, FormState } from '../../actions';

type Props = {
  idea: { title: string; memo: string };
  ideaId: string;
  summary: Summary;
  docs: Doc[];
  generatable: DocKey[];
  /** 서버가 아는 생성 중 문서 */
  running: DocKey | null;
  generateAction: (key: DocKey, prev: DocActionState) => Promise<DocActionState>;
  updateDocAction: (key: DocKey, prev: DocActionState, formData: FormData) => Promise<DocActionState>;
  updateAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  trashAction: () => Promise<void>;
};

export default function IdeaDetail({
  idea,
  ideaId,
  summary,
  docs,
  generatable,
  running,
  generateAction,
  updateDocAction,
  updateAction,
  trashAction,
}: Props) {
  // 이 화면에서 시작한 생성 (서버 running이 갱신되기 전에도 다른 카드를 막는다)
  const [busy, setBusy] = useState<DocKey | null>(null);
  const demo = useDemo();
  // 다른 탭 · 새로고침 뒤의 생성 중 표시는 서버 값을 3초마다 다시 받아 맞춘다
  useRefreshWhile(running !== null && busy === null);
  // Server Action은 클라이언트에서 하나씩 실행되므로 생성 중엔 다른 저장 버튼을 막는다
  const generating = (busy ?? running) !== null;
  const confirmTrash = (e: React.FormEvent) => {
    if (!window.confirm('휴지통(~/Hatch/.trash)으로 옮길까요? 파일은 지워지지 않아요.')) e.preventDefault();
  };

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<DocKey>(() => firstTab(docs, summary.next));
  // 저장에 성공하면 읽기로 돌아간다
  const saveIdea = async (prev: FormState, fd: FormData) => {
    const next = await updateAction(prev, fd);
    if (!next.error) setEditing(false);
    return next;
  };

  return (
    <>
      <FlexBox justifyContent="space-between" alignItems="flex-start" gap="12px">
        <PageHeader title={idea.title} description={idea.memo || undefined} />
        {!demo && !editing && (
          <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(true)} disabled={generating}>
            수정
          </Button>
        )}
      </FlexBox>

      {editing && (
        <Box sx={{ marginBottom: '24px' }}>
          <IdeaForm action={saveIdea} submitLabel="수정 저장" initial={idea} disabled={generating} />
          <FlexBox justifyContent="space-between" sx={{ marginTop: '8px' }}>
            <form action={trashAction} onSubmit={confirmTrash}>
              <Button type="submit" variant="outlined" color="assistive" size="small" disabled={generating}>
                휴지통으로
              </Button>
            </form>
            <Button size="small" variant="outlined" color="assistive" onClick={() => setEditing(false)}>
              취소
            </Button>
          </FlexBox>
        </Box>
      )}

      <IdeaSummary summary={summary} docs={docs} ideaId={ideaId} onOpenDoc={setTab} />

      <SectionTitle>문서</SectionTitle>
      <DocTabs
        docs={docs}
        running={busy ?? running}
        value={tab}
        onChange={setTab}
        render={(doc) => (
          <DocCard
            doc={doc}
            ready={generatable.includes(doc.key)}
            hasSource={doc.from === 'idea' || docs.find((d) => d.key === doc.from)?.content != null}
            running={busy ?? running}
            onBusy={setBusy}
            generate={generateAction}
            update={updateDocAction}
          />
        )}
      />
    </>
  );
}
