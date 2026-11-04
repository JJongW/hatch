#!/usr/bin/env bash
# 서명 없는 Hatch.app을 macos/dist/에 만든다 (spec 2026-11-04-macos-app §1, E2).
# 레포 어디서 불러도 레포 뿌리로 옮겨서 돈다 (next.config.ts의 outputFileTracingRoot가 process.cwd()라서)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
APP="$ROOT/macos/dist/Hatch.app"
SA="$ROOT/.next/standalone"

rm -rf "$SA"
HATCH_STANDALONE=1 npm run build

[ -f "$SA/server.js" ] || { echo "server.js가 없어요. HATCH_STANDALONE 빌드를 확인해 주세요." >&2; exit 1; }
# 번들에 소스가 들어가면 안 된다 (next.config.ts outputFileTracingExcludes)
for d in src docs bridge supabase macos .anatomy .superpowers; do
  [ ! -e "$SA/$d" ] || { echo "standalone에 $d가 들어갔어요. next.config.ts의 outputFileTracingExcludes에 더해 주세요." >&2; exit 1; }
done
# .env 파일이 들어가면 데모, 발행 토큰 같은 값이 앱 서버에 섞인다 (spec §1-1)
for f in "$SA"/.env*; do
  [ ! -e "$f" ] || { echo "standalone에 $(basename "$f")가 들어갔어요. 빌드 전에 빼 주세요." >&2; exit 1; }
done

(cd macos && swift build -c release)
BIN="$(cd macos && swift build -c release --show-bin-path)/Hatch"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/hatch/.next"
cp "$BIN" "$APP/Contents/MacOS/Hatch"
cp macos/Info.plist "$APP/Contents/Info.plist"
cp -R "$SA/." "$APP/Contents/Resources/hatch/"
cp -R public "$APP/Contents/Resources/hatch/public"
cp -R .next/static "$APP/Contents/Resources/hatch/.next/static"

echo "만들었어요: $APP"
