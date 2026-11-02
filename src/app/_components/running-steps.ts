import type { DocKey } from '@/lib/storage';

// 생성 대기 화면의 "예상 순서". claude -p는 중간 진행을 알려 주지 않아서, 프롬프트가 시키는 순서를 시간에 맞춰 보여 줄 뿐이다 (spec 2026-11-02 motion §1)
// 프롬프트 순서가 바뀌면 여기도 맞춘다
export const DOC_RUNNING_STEPS: Record<DocKey, readonly string[]> = {
  plan: ['아이디어와 맥락 읽기', '문제와 대상 사용자 정리', '핵심 가치와 주요 기능 뽑기', '성공 지표와 위험 쓰기', '모르는 것은 확인 필요로 남기기'],
  roadmap: ['기획안 읽기', '단계 나누기', '단계별 기능과 순서 정하기', '위험과 확인할 것 쓰기'],
  prd: ['로드맵 읽기', '목표와 범위 정리', '요구사항 쓰기', '측정 방법과 출시 조건 쓰기'],
  spec: ['PRD 읽기', '화면과 기능 나누기', '기능마다 동작과 예외 쓰기', '정책과 확인할 것 정리'],
  data: ['기능명세 읽기', '저장할 것 뽑기', '항목과 관계 정하기', '쌓이는 기록 정리'],
  'dev-prompt': ['기능명세 읽기', '작업 원칙 정하기', '구현 순서와 테스트 쓰기', '정하지 않을 것 표시하기'],
  'design-prompt': ['데이터 구성 읽기', '화면 목록 정하기', '화면마다 상태와 문구 쓰기', '확인할 것 표시하기'],
};

/** 예상 시간(초) 안에 단계를 고르게 나눠, 지금까지 보일 단계 수. 첫 단계는 바로 보이고 마지막 단계는 끝날 때까지 남는다 */
export function visibleSteps(elapsedSec: number, total: number, expectSec = 60): number {
  if (total <= 0) return 0;
  const each = expectSec / total;
  return Math.min(total, Math.floor(Math.max(0, elapsedSec) / each) + 1);
}

/** 72 → '1분 12초', 9 → '9초' */
export const formatElapsed = (sec: number) => (sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${String(sec % 60).padStart(2, '0')}초`);
