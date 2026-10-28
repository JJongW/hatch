#!/usr/bin/env node
// 테스트용 가짜 claude. FAKE_CLAUDE 값으로 동작을 고른다.
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const mode = process.env.FAKE_CLAUDE ?? 'ok';
  if (mode === 'ok') {
    const args = process.argv.slice(2);
    console.log(JSON.stringify({ is_error: false, structured_output: { echo: input, args } }));
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
  } else if (mode === 'korean') {
    // 멀티바이트 문자가 청크 경계에서 잘리도록 큰 한글 출력을 나눠 쓴다
    const buf = Buffer.from(JSON.stringify({ is_error: false, structured_output: { text: '가'.repeat(100000) } }));
    for (let i = 0; i < buf.length; i += 4999) process.stdout.write(buf.subarray(i, i + 4999));
  }
});
