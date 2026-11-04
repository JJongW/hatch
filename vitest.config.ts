import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // server-only는 react-server 밖에서 import하면 throw한다. 테스트에선 빈 모듈로.
      'server-only': path.resolve(__dirname, 'src/test/empty.ts'),
    },
  },
  // 빌드 결과(.next/standalone 사본)의 테스트 파일을 줍지 않게 제외한다
  test: { environment: 'node', exclude: [...configDefaults.exclude, '.next/**', 'macos/dist/**', 'macos/.build/**'] },
});
