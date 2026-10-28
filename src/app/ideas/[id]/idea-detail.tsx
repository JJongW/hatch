'use client';

import { useState } from 'react';
import { Button, FlexBox } from '@montage-ui/core';

import IdeaForm from '../../_components/idea-form';
import PageHeader from '../../_components/page-header';
import SectionTitle from '../../_components/section-title';

import DocCard from './doc-card';
import { useRefreshWhile } from './use-refresh-while';

import type { Doc, DocKey } from '@/lib/storage';
import type { DocActionState, FormState } from '../../actions';

type Props = {
  idea: { title: string; memo: string };
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
  // 다른 탭 · 새로고침 뒤의 생성 중 표시는 서버 값을 3초마다 다시 받아 맞춘다
  useRefreshWhile(running !== null && busy === null);
  const confirmTrash = (e: React.FormEvent) => {
    if (!window.confirm('휴지통(~/Hatch/.trash)으로 옮길까요? 파일은 지워지지 않아요.')) e.preventDefault();
  };

  return (
    <>
      <PageHeader title={idea.title} description="아이디어를 고치고, 아래에서 이어지는 문서를 확인해요." />
      <IdeaForm action={updateAction} submitLabel="수정 저장" initial={idea} />

      <form action={trashAction} onSubmit={confirmTrash}>
        <FlexBox justifyContent="flex-end" sx={{ marginTop: '8px' }}>
          <Button type="submit" variant="outlined" color="assistive" size="small">
            휴지통으로
          </Button>
        </FlexBox>
      </form>

      <SectionTitle>문서</SectionTitle>
      <FlexBox flexDirection="column" gap="12px">
        {docs.map((doc, i) => (
          <DocCard
            key={doc.key}
            doc={doc}
            index={i}
            ready={generatable.includes(doc.key)}
            hasSource={doc.from === 'idea' || docs.find((d) => d.key === doc.from)?.content != null}
            running={busy ?? running}
            onBusy={setBusy}
            generate={generateAction}
            update={updateDocAction}
          />
        ))}
      </FlexBox>
    </>
  );
}
