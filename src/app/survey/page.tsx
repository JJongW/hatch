import { connection } from 'next/server';

import { isSurveyReady } from '@/lib/survey/store';

import FocusPage from '../_components/focus-page';
import PageHeader from '../_components/page-header';

import { submitSurveyAction } from './actions';
import SurveyForm from './survey-form';

// 참가자가 테스트 직후 여는 설문 (#71). 연결 정보는 요청 때 읽는다 (배포 뒤 환경 변수를 바꿔도 다시 빌드할 필요 없게)
export const instant = false;

export default async function SurveyPage() {
  await connection();
  return (
    <>
      <FocusPage />
      <PageHeader
        title="Hatch 사용 설문"
        description="오늘 써 본 Hatch에 대한 설문이에요. 5분쯤 걸려요. 정답은 없고, 불편했던 점일수록 큰 도움이 돼요. 이름이나 회사는 묻지 않아요."
      />
      <SurveyForm ready={isSurveyReady()} action={submitSurveyAction} />
    </>
  );
}
