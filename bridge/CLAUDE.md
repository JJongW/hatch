# bridge/ — 맥 중계 서버 (보류)

> **보류 (2026-10-28, B spec §1)**: Next 서버가 맥에서 `claude -p`를 직접 실행하고, 다른 기기는 Tailscale Serve로 연다 (README). 아래는 다시 꺼낼 때를 위한 메모.
> 다시 꺼낼 신호: 맥이 꺼져 있어도 써야 함 / 다른 사람도 씀 / Vercel 배포 필요

담당: `bridge-engineer`

## 역할
브라우저(Vercel 사이트) → Tailscale Serve(`*.ts.net` HTTPS) → 이 서버 → `claude -p` → 결과 반환.
Vercel 서버는 tailnet 밖이라 호출은 **브라우저에서 직접**.

## 보안 규칙 (필수)
- `claude -p` 는 도구 없이 텍스트만 출력 (Bash · 파일 수정 도구 허용 금지)
- 접근 토큰 필수. 토큰은 `.env` (git 제외), 로그에 찍지 않음
- CORS는 내 Vercel 도메인 + localhost만
- 입력 길이 제한, 동시 실행 1개

## 확인할 것 (B spec 전에)
- Chrome Private Network Access가 공개 사이트 → 100.x 요청을 막는지

## 갈아탈 신호
맥 꺼져 있어도 써야 함 / 다른 사람도 씀 → 작업 대기열(Supabase · Upstash + 맥 워커)

## 하지 말 것
- Tailscale Funnel로 공개할 때 인증 없이 열기
- 사이트(`src/`) 코드 import
