// 사용자 테스트 참가자 설문 (#71). 문서판은 docs/user-test/form.md. 문항을 바꾸면 둘 다 고치고 SURVEY_VERSION을 올린다

/** 문항 판 번호. Supabase 표의 version 칸에 같이 남는다 */
export const SURVEY_VERSION = 2; // 2: 데모만 본 사람에게 묻는 6문항으로 바꿈 (참가자 번호 뺌)

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

// 참가자는 데모만 본다. 그래서 기능을 써 본 소감 대신 두 가지를 묻는다:
// 이 문제를 실제로 겪나(3, 4 = 문제 정의 근거), 데모만 보고 무엇을 하는 서비스인지 알겠나(5, 6)
export const SECTIONS: readonly Section[] = [
  {
    title: '나에 대해',
    questions: [
      { id: 'role', label: '무슨 일을 하세요?', required: true, type: 'single', options: ['서비스 기획(PO, PM)', '사업 기획', '마케터', '디자인', '개발', '기타'] },
      { id: 'aiUse', label: '기획 문서를 쓸 때 ChatGPT나 Claude 같은 AI를 써 봤나요?', required: true, type: 'single', options: ['자주 써요', '가끔 써요', '안 써 봤어요'] },
    ],
  },
  {
    title: 'AI로 문서를 쓸 때',
    questions: [
      {
        id: 'pains', label: 'AI로 기획 문서를 쓰다가 이런 일이 있었나요? 있던 것을 모두 골라 주세요.', required: true, type: 'multi',
        options: [
          'AI가 근거 없는 숫자를 그럴듯하게 채워 넣었다',
          '회사나 서비스 설명을 대화마다 다시 붙여 넣었다',
          '나중에 "이거 왜 이렇게 정했지?" 하고 기억이 안 났다',
          '문서 하나를 고치고, 이어진 다른 문서는 못 고쳤다',
          '없었다',
        ],
      },
      { id: 'worst', label: '그중 가장 곤란했던 때를 하나 적어 주세요. 언제, 무슨 문서를 쓰다가 그랬나요?', required: false, type: 'long' },
    ],
  },
  {
    title: '데모를 보고',
    description: '회사 내부 정보나 다른 사람을 알아볼 수 있는 내용은 빼고 적어 주세요.',
    questions: [
      { id: 'whatIs', label: 'Hatch가 무엇을 해 주는 서비스인지 한 문장으로 적어 주세요.', required: true, type: 'short' },
      { id: 'want', label: '지금 쓰는 방식 대신 Hatch를 써 보고 싶나요?', required: true, type: 'scale', min: 1, max: 5, minLabel: '전혀 아니다', maxLabel: '꼭 써 보고 싶다' },
      { id: 'wantWhy', label: '그렇게 고른 이유를 짧게 적어 주세요.', required: true, type: 'short' },
    ],
  },
];

export const QUESTIONS: readonly Question[] = SECTIONS.flatMap((s) => s.questions);
