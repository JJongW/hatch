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
  }
});
