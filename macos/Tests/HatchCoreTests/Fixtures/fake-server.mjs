// 테스트용 가짜 Hatch 서버. FAKE_SERVER 값으로 동작을 고른다
// ok: status에 비밀값이 맞으면 200 / crash: 바로 3으로 끝남 / ignore-term: SIGTERM을 무시 (SIGKILL 확인용)
import http from 'node:http';

const mode = process.env.FAKE_SERVER ?? 'ok';
if (mode === 'crash') {
  console.error('boom');
  process.exit(3);
}
if (mode === 'ignore-term') process.on('SIGTERM', () => console.log('ignored SIGTERM'));

const server = http.createServer((req, res) => {
  const ok = req.url === '/api/app/status' && req.headers['x-hatch-app-token'] === process.env.HATCH_APP_TOKEN;
  res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
  res.end(ok ? '{"ok":true}' : '{"ok":false}');
});
server.listen(Number(process.env.PORT), process.env.HOSTNAME, () => console.log(`ready ${process.env.PORT}`));
