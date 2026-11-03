import { formatCost } from './summary';

// 채팅 vs Hatch 파일럿 1회 측정값 (#121). 원본: docs/user-test/pilot-chat-vs-hatch.md
// 앱이 채팅 쪽을 잴 수는 없어 고정 값이다. 사람 테스트(과제 8) 결과가 나오면 이 값을 그 평균으로 바꾼다
export const PILOT = {
  date: '2026-11-03',
  model: 'claude-opus-5-5',
  idea: '동네 헬스장 PT 예약 앱',
  secs: { chat: [78, 70, 96], hatch: [22, 30, 37] }, // 기획안 · 로드맵 · PRD
  questionsSec: 19, // Hatch 확인 질문. 채팅에는 없는 단계라 시간 합에서 따로 적는다
  claims: { chat: 217, hatch: 0 },
  tbd: { chat: 0, hatch: 58 },
  questions: 11, // Hatch만
  costUSD: { chat: 0.78, hatch: 0.43 },
  calls: { chat: 3, hatch: 4 },
} as const;

const sum = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0);

/** 화면 표 한 줄씩. 숫자는 여기서만 문장으로 바꾼다 */
export const pilotRows = () => [
  { label: '기획안 · 로드맵 · PRD 만든 시간', chat: `${sum(PILOT.secs.chat)}초`, hatch: `${sum(PILOT.secs.hatch)}초 (확인 질문 ${PILOT.questionsSec}초 따로)` },
  { label: '근거 없이 단정한 수치', chat: `${PILOT.claims.chat}개`, hatch: `${PILOT.claims.hatch}개` },
  { label: '[확인 필요]로 남긴 곳', chat: `${PILOT.tbd.chat}곳`, hatch: `${PILOT.tbd.hatch}곳` },
  { label: '물어볼 질문', chat: '없음', hatch: `${PILOT.questions}개` },
  { label: '기획안을 고친 뒤 표시', chat: '없음', hatch: '로드맵에만 (PRD는 놓침)' },
  { label: '정가 기준 비용', chat: `${formatCost(PILOT.costUSD.chat)} (${PILOT.calls.chat}번)`, hatch: `${formatCost(PILOT.costUSD.hatch)} (${PILOT.calls.hatch}번, 확인 질문 포함)` },
];
