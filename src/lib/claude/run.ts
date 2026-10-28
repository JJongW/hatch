import 'server-only';

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** 화면에 그대로 보여 줘도 되는 체인 오류 (한국어 한 줄) */
export class ChainError extends Error {}

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const LOGIN_HINT = 'Claude 실행에 실패했어요. 터미널에서 `claude`를 한 번 실행해 로그인 상태를 확인해 주세요.';

let busy = false;
export const isClaudeBusy = () => busy;

export async function runClaude({
  prompt,
  jsonSchema,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  killGraceMs = 3000,
}: {
  prompt: string;
  jsonSchema: object;
  timeoutMs?: number;
  /** 시간 초과 시 SIGTERM 뒤 SIGKILL까지 기다리는 시간 */
  killGraceMs?: number;
}): Promise<unknown> {
  if (busy) throw new ChainError('다른 문서를 만드는 중이에요. 끝난 뒤 다시 눌러 주세요.');
  busy = true;
  let cwd: string | undefined;
  try {
    // 프로젝트 CLAUDE.md를 읽지 않도록 빈 폴더에서 실행
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'hatch-claude-'));
    const stdout = await spawnClaude(prompt, jsonSchema, cwd, timeoutMs, killGraceMs);
    let res: { is_error?: boolean; structured_output?: unknown };
    try {
      res = JSON.parse(stdout);
    } catch {
      throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    }
    if (res.is_error) throw new ChainError(LOGIN_HINT);
    if (res.structured_output === undefined) throw new ChainError('결과 형식이 맞지 않아요. 다시 만들어 주세요.');
    return res.structured_output;
  } finally {
    busy = false;
    if (cwd) await fs.rm(cwd, { recursive: true, force: true }); // 방금 만든 빈 임시 폴더
  }
}

function spawnClaude(prompt: string, jsonSchema: object, cwd: string, timeoutMs: number, killGraceMs: number) {
  const bin = process.env.HATCH_CLAUDE_BIN?.trim() || 'claude';
  const model = process.env.HATCH_CLAUDE_MODEL?.trim();
  const args = [
    '-p',
    '--output-format', 'json',
    '--json-schema', JSON.stringify(jsonSchema),
    '--tools', '',
    '--no-session-persistence',
    ...(model ? ['--model', model] : []),
  ];

  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let timedOut = false;
    let failedToSpawn = false;
    let killTimer: NodeJS.Timeout | undefined;
    // 종료(close)된 뒤에만 settle해서 잠금 · 임시 폴더가 자식 종료 전에 풀리지 않게 한다
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), killGraceMs);
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdin.on('error', () => {}); // 먼저 종료한 자식 때문에 EPIPE로 서버가 죽지 않게
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('error', (e: NodeJS.ErrnoException) => {
      failedToSpawn = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      reject(
        e.code === 'ENOENT'
          ? new ChainError('claude를 찾을 수 없어요. Claude Code가 설치돼 있는지 확인해 주세요.')
          : new ChainError(LOGIN_HINT),
      );
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      if (failedToSpawn) return; // error 핸들러가 이미 reject함
      if (timedOut) return reject(new ChainError('5분 안에 끝나지 않았어요. 다시 만들어 주세요.'));
      if (code === 0) return resolve(out);
      console.error(`[hatch] claude 종료 코드 ${code}: ${err.slice(0, 500)}`); // stderr만, 프롬프트는 남기지 않음
      reject(new ChainError(LOGIN_HINT));
    });
    child.stdin.end(prompt);
  });
}
