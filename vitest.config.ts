import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // server-only는 react-server 밖에서 import하면 throw한다. 테스트에선 빈 모듈로.
      'server-only': path.resolve(__dirname, 'src/test/empty.ts'),
    },
  },
  test: { environment: 'node' },
});
