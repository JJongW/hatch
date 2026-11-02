'use client';

import { FlexBox, Typography } from '@montage-ui/core';

import CodeBlock from '../_components/code-block';
import SectionTitle from '../_components/section-title';

const SETUP = (repoUrl: string) => `git clone ${repoUrl}.git
cd hatch
cp .env.example .env.local
npm install
npm run dev`;

const body = (text: React.ReactNode) => (
  <Typography as="p" variant="body2" sx={{ display: 'block' }}>
    {text}
  </Typography>
);

const list = (items: React.ReactNode[]) => (
  <Typography as="ul" variant="body2" sx={{ display: 'block', paddingLeft: '20px', listStyle: 'disc' }}>
    {items.map((it, i) => (
      <li key={i} style={{ marginBottom: '4px' }}>
        {it}
      </li>
    ))}
  </Typography>
);

export default function StartGuide({ repoUrl }: { repoUrl: string }) {
  return (
    <FlexBox flexDirection="column" gap="8px">
      <SectionTitle>데모에서 되는 것과 안 되는 것</SectionTitle>
      {list([
        <>
          <b>됨</b> — 샘플 아이디어 3개, 이어진 문서 6종, PO 도구 4종의 샘플 결과 둘러보기
        </>,
        <>
          <b>안 됨</b> — 아이디어 저장, 문서 만들기, 도구 실행. 생성은 각자 컴퓨터의 Claude Code(<code>claude -p</code>)가 하므로 인터넷 데모에선 할 수 없어요
        </>,
      ])}

      <SectionTitle>준비물</SectionTitle>
      {list([
        'macOS, Linux, Windows 중 하나와 Node.js 20.9 이상',
        <>
          Claude Code 설치 후 로그인 — 터미널에서 <code>claude -p &quot;안녕&quot;</code>이 답하면 준비 끝
        </>,
      ])}

      <SectionTitle>실행</SectionTitle>
      <CodeBlock lang="bash" code={SETUP(repoUrl)} />
      {body(
        <>
          http://localhost:3000 에서 열어요. 데이터는 홈 폴더의 <code>~/Hatch</code>에 md 파일로 쌓여요. Windows는 PowerShell에서 같은 명령을 붙여 넣어요.
        </>,
      )}

      <SectionTitle>처음 10분</SectionTitle>
      {list([
        '아이디어 쓰기에 한 줄 적고 Enter → 아이디어 모음에서 열기',
        '상세 화면에서 기획안부터 만들기 (단계마다 30초~1분 30초)',
        'PO 도구 → PRD 리뷰 위원회 → 방금 만든 PRD로 실행 → 고친 판으로 다시 리뷰해 전후 비교',
      ])}
    </FlexBox>
  );
}
