# src/components/ — 공용 UI (D)

담당: `ui-builder` · **작업 전 `montage-ui` 스킬 필수**

## 파일 지도
- 화면 2곳 이상에서 쓰는 컴포넌트만 여기. 한 곳에서만 쓰면 그 라우트 폴더에 둔다
- 컴포넌트 하나 = 폴더 하나: `index.tsx` (+ 4줄 넘는 스타일은 `style.ts`)

## 규칙
- Montage 컴포넌트 먼저 찾고, 없을 때만 Montage 위에 조립
- props 먼저, `sx`는 props로 안 될 때만
- 색 · 그림자 · 타이포는 Montage 토큰 (`theme.semantic.*`, `Typography`)
- TDS는 화면 패턴 · 문구 톤만 참고. TDS 토큰 · 컴포넌트 도입 금지

## 하지 말 것
- `#RRGGBB` 하드코딩, `var(--semantic-...)` 직접 사용
- 데이터 저장 · AI 호출 (props로만 받는다)
