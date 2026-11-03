import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { dataDir } from './paths';

afterEach(() => {
  delete process.env.HATCH_DATA_DIR;
});

describe('dataDir', () => {
  it('비우면 홈 폴더의 Hatch', () => {
    expect(dataDir()).toBe(path.join(os.homedir(), 'Hatch'));
  });

  it('Windows식 ~\\Hatch도 홈 폴더 기준으로 푼다', () => {
    process.env.HATCH_DATA_DIR = '~\\Hatch';
    expect(dataDir().startsWith(os.homedir())).toBe(true);
  });

  it('~로 시작하지 않으면 그대로', () => {
    process.env.HATCH_DATA_DIR = '/tmp/hatch-x';
    expect(dataDir()).toBe('/tmp/hatch-x');
  });
});
