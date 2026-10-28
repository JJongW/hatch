#!/usr/bin/env node
import { spawn } from 'node:child_process';
// 테스트용 가짜 claude. FAKE_CLAUDE 값으로 동작을 고른다.
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const mode = process.env.FAKE_CLAUDE ?? 'ok';
  if (mode === 'ok') {
    const args = process.argv.slice(2);
    console.log(JSON.stringify({ is_error: false, structured_output: { echo: input, args } }));
  } else if (mode === 'plan') {
    console.log(
      JSON.stringify({
        is_error: false,
        structured_output: {
          summary: '동네 원데이 클래스 추천',
          problem: '퇴근 후 할 거리를 찾기 어렵다',
          targetUsers: ['직장인'],
          value: '가까운 곳에서 바로 예약',
          features: [{ name: '추천', description: '취향 기반 추천' }],
          successMetrics: ['예약 전환율 — [확인 필요: 목표치]'],
          risks: ['공급자 확보'],
          openQuestions: ['결제 수수료'],
        },
      }),
    );
  } else if (mode === 'prd-review') {
    const criteria = ['명확성', '실현 가능성', '측정 가능성', '사용자 가치', '위험 대응'];
    const scores = (base) => criteria.map((criterion, i) => ({ criterion, score: i % 2 ? base : base + 1, reason: '근거가 일부 부족하다' }));
    console.log(
      JSON.stringify({
        is_error: false,
        structured_output: {
          reviews: [
            { reviewer: '개발', objections: [{ issue: 'API 범위가 정해지지 않았다', severity: 3, suggestion: '엔드포인트 목록을 적는다' }, { issue: '용어가 섞여 있다', severity: 1, suggestion: '용어를 통일한다' }], scores: scores(3) },
            { reviewer: '디자인', objections: [{ issue: '빈 상태 화면이 없다', severity: 2, suggestion: '빈 상태 시안을 추가한다' }], scores: scores(3) },
            { reviewer: '마케팅', objections: [], scores: scores(4) },
            { reviewer: 'CS', objections: [{ issue: '문의 경로가 없다', severity: 2, suggestion: '문의 채널을 정한다' }], scores: scores(3) },
          ],
          summary: '큰 막힘은 API 범위 하나다. 보완 후 진행해도 된다.',
        },
      }),
    );
  } else if (mode === 'voc') {
    const topics = [{ name: '결제', description: '결제 실패 · 환불 문의' }, { name: '검색', description: '원하는 결과가 안 나온다' }, { name: '알림', description: '알림이 너무 많다' }];
    const items = [[1, '결제', 5], [2, '검색', 3], [3, '결제', 4], [4, '알림', 2], [5, '없는 주제', 3]].map(([line, topic, severity]) => ({ line, topic, severity }));
    console.log(JSON.stringify({ is_error: false, structured_output: { topics, items } }));
  } else if (mode === 'metrics') {
    const m = (name) => ({ name, definition: `${name} 사용자 수 ÷ 방문자 수 (주간)`, why: '문서의 목표와 바로 이어진다' });
    console.log(JSON.stringify({ is_error: false, structured_output: { coreMetric: m('예약 전환율'), secondaryMetrics: [m('추천 클릭률'), m('상세 조회율')], guardrails: [m('결제 오류율')], experiments: [{ hypothesis: '추천을 맨 위에 두면 예약이 늘 것이다', variants: ['대조군: 현재 목록', '변형 A: 추천 맨 위'], primaryMetric: '예약 전환율' }] } }));
  } else if (mode === 'error') {
    console.log(JSON.stringify({ is_error: true, result: 'Not logged in' }));
  } else if (mode === 'crash') {
    console.error('boom');
    process.exit(2);
  } else if (mode === 'slow') {
    setTimeout(() => {}, 60_000);
  } else if (mode === 'stubborn') {
    process.on('SIGTERM', () => {}); // SIGTERM 무시 -> SIGKILL 경로
    setTimeout(() => {}, 60_000);
  } else if (mode === 'grandchild') {
    // 손자가 stdout을 붙잡은 채 살아 있다 (2.5초 뒤 스스로 끝남). 부모는 SIGTERM에 죽는다.
    spawn(process.execPath, ['-e', 'setTimeout(() => {}, 2500)'], {
      detached: true,
      stdio: ['ignore', 'inherit', 'inherit'],
    }).unref();
    setTimeout(() => {}, 60_000);
  } else if (mode === 'korean') {
    // 멀티바이트 문자가 청크 경계에서 잘리도록 큰 한글 출력을 나눠 쓴다
    const buf = Buffer.from(JSON.stringify({ is_error: false, structured_output: { text: '가'.repeat(100000) } }));
    for (let i = 0; i < buf.length; i += 4999) process.stdout.write(buf.subarray(i, i + 4999));
  }
});
