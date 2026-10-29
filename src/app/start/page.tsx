import { REPO_URL } from '@/lib/demo';

import PageHeader from '../_components/page-header';

import StartGuide from './start-guide';

// 데모 배너 · "내 환경에서 사용하기"가 오는 곳. 파일을 읽지 않는 정적 안내 페이지
export default function StartPage() {
  return (
    <>
      <PageHeader title="내 환경에서 사용하기" description="문서 생성과 도구 실행은 내 맥의 Claude Code가 해요. 10분이면 준비돼요." />
      <StartGuide repoUrl={REPO_URL} />
    </>
  );
}
