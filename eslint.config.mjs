import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 맥 앱 빌드 결과 (macos/scripts/build.sh). 번들 안 Next 빌드 파일이라 검사하지 않는다
    "macos/dist/**",
    "macos/.build/**",
  ]),
]);

export default eslintConfig;
