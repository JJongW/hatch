// 사용자 테스트 참가자 설문 (#71). 문서판은 docs/user-test/form.md. 문항을 바꾸면 둘 다 고치고 SURVEY_VERSION을 올린다

/** 문항 판 번호. Supabase 표의 version 칸에 같이 남는다 */
export const SURVEY_VERSION = 1;

/** 참가자 번호. 늘리면 supabase/survey.sql의 check 제약도 같이 늘린다 */
export const PARTICIPANTS = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
export type Participant = (typeof PARTICIPANTS)[number];

type Base = { id: string; label: string; required: boolean };
export type Question = Base &
  (
    | { type: 'single'; options: readonly string[] }
    | { type: 'multi'; options: readonly string[] }
    | { type: 'scale'; min: number; max: number; minLabel: string; maxLabel: string }
    | { type: 'grid'; rows: readonly string[]; options: readonly string[] }
    | { type: 'short' }
    | { type: 'long' }
  );
export type Section = { title: string; description?: string; questions: readonly Question[] };

export const MAX_SHORT = 200;
export const MAX_LONG = 2000;

/** 사용자 테스트 과제. 흐름 체험(/try)의 과제 표도 같은 문구를 쓴다 */
export const TASKS = [
  '아이디어 남기기',
  '맥락(대상 고객, 목표) 적기',
  '기획안 만들고 지금 내릴 결정 찾기',
  '확인이 안 된 부분을 질문으로 정리하기',
  '답한 내용을 기획안에 반영하기',
  'PRD 검토받고 반론 반영하기',
  '고객 의견 정리하기',
];
const agree = { type: 'scale', min: 1, max: 5, minLabel: '전혀 아니다', maxLabel: '매우 그렇다' } as const;

export const SECTIONS: readonly Section[] = [
  {
    title: '시작',
    questions: [
      { id: 'participant', label: '진행자가 알려 준 참가자 번호', required: true, type: 'single', options: PARTICIPANTS },
      { id: 'role', label: '지금 하는 일', required: true, type: 'single', options: ['서비스 기획(PO, PM)', '사업 기획', '디자인', '개발', '기타'] },
      { id: 'years', label: '기획 문서를 써 본 기간', required: true, type: 'single', options: ['1년 미만', '1년 이상 3년 미만', '3년 이상 5년 미만', '5년 이상'] },
      { id: 'aiUse', label: '기획 문서를 쓸 때 AI를 얼마나 쓰나요', required: true, type: 'single', options: ['거의 안 씀', '가끔', '문서마다 씀'] },
      { id: 'aiTools', label: '주로 쓰는 AI 도구', required: false, type: 'multi', options: ['ChatGPT', 'Claude', 'Gemini', '노션 AI', '기타'] },
    ],
  },
  {
    title: '과제별로 돌아보기',
    description: '오늘 해 본 과제예요. 안 한 과제는 "안 함"을 골라 주세요.',
    questions: [
      { id: 'taskDone', label: '각 과제를 어떻게 마쳤나요', required: true, type: 'grid', rows: TASKS, options: ['혼자 해냄', '도움 받아 해냄', '못 함', '안 함'] },
      { id: 'taskEase', label: '각 과제가 얼마나 쉬웠나요 (1 매우 어려움, 5 매우 쉬움)', required: true, type: 'grid', rows: TASKS, options: ['1', '2', '3', '4', '5', '안 함'] },
    ],
  },
  {
    title: '장면별로 묻기',
    questions: [
      { id: 'h1FindDecision', label: '기획안을 만든 뒤, 지금 내려야 할 결정을 찾기 쉬웠다', required: true, ...agree },
      { id: 'h2QuestionCount', label: '확인이 필요한 질문의 수는 어땠나요', required: true, type: 'single', options: ['너무 적다', '적당하다', '많지만 볼 만하다', '너무 많아 다 못 봤다'] },
      { id: 'h3NoticedDecision', label: '내가 답한 내용이 다시 만든 기획안에 들어간 걸 알아챘나요', required: true, type: 'single', options: ['바로 알았다', '찾아보고 알았다', '몰랐다', '못 해 봤다'] },
      { id: 'h4PrdStale', label: '기획안을 다시 만든 뒤, PRD도 다시 봐야 한다고 생각했나요', required: true, type: 'single', options: ['그렇다', '아니다', '생각 못 했다', '못 해 봤다'] },
      { id: 'h5ReviewWait', label: 'PRD 검토를 기다린 시간(1~2분)은 어땠나요', required: true, type: 'single', options: ['짧았다', '괜찮았다', '길었다', '멈춘 줄 알았다', '못 해 봤다'] },
      {
        id: 'mostUseful', label: '만든 문서에서 가장 쓸모 있던 것', required: false, type: 'multi',
        options: ['기획안', '개발 로드맵', 'PRD', '기능명세', '데이터 구성', '개발 프롬프트', '디자인 프롬프트', '확인 질문', 'PRD 리뷰', '고객 의견 정리', '없음'],
      },
    ],
  },
  {
    title: '전체 평가',
    questions: [
      { id: 'easy', label: '쓰기 쉬웠다', required: true, ...agree },
      { id: 'trust', label: '만든 문서를 믿고 팀에 공유할 수 있다', required: true, ...agree },
      { id: 'reuse', label: '다음 주 실제 일에 다시 쓸 것 같다', required: true, ...agree },
      { id: 'recommend', label: '동료 기획자에게 추천할 의향', required: true, type: 'scale', min: 0, max: 10, minLabel: '전혀 없음', maxLabel: '꼭 추천' },
    ],
  },
  {
    title: '직접 적기',
    description: '회사 내부 정보나 다른 사람을 알아볼 수 있는 내용은 빼고 적어 주세요.',
    questions: [
      { id: 'confusing', label: '가장 헷갈렸던 순간 하나를 적어 주세요', required: true, type: 'long' },
      { id: 'whyHatch', label: 'Claude나 ChatGPT 채팅 대신 Hatch를 쓸 이유가 있다면 한 문장으로 적어 주세요. 없다면 "없음"도 좋아요', required: true, type: 'short' },
      { id: 'wish', label: '이게 있으면 쓰겠다 싶은 것 하나', required: false, type: 'short' },
      { id: 'cut', label: '없어도 될 것 같은 것 하나', required: false, type: 'short' },
      { id: 'other', label: '그 밖에 하고 싶은 말', required: false, type: 'long' },
    ],
  },
  {
    title: '마무리',
    questions: [
      { id: 'data', label: '오늘 넣은 아이디어와 문서는 어떻게 할까요', required: true, type: 'single', options: ['파일로 받고 싶어요', '지워 주세요', '그대로 둬도 돼요'] },
      { id: 'retest', label: '고친 판이 나오면 다시 테스트해 볼 의향이 있나요', required: false, type: 'single', options: ['있어요', '없어요'] },
    ],
  },
];

export const QUESTIONS: readonly Question[] = SECTIONS.flatMap((s) => s.questions);
