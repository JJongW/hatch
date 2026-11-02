---
name: montage-ui
description: Hatch에서 Montage(원티드 웹 디자인 시스템)로 화면 · 컴포넌트 · 스타일을 만들 때 쓴다. 컴포넌트 고르기, sx · 테마 토큰, 색 · 타이포 · 아이콘, 레이아웃 간격 규칙과 스펙 조회 방법을 담는다.
---

# Montage로 UI 만들기

원본: [montage-web `montage-react` 스킬](https://github.com/wanteddev/montage-web/tree/main/.claude-plugin/montage-web-guide) (MIT) 요약.
공식 MCP는 @wantedlab.com 계정 전용이라 **스펙은 설치된 타입 파일에서 찾는다.**

## 1. 스펙 찾기 (추측 금지)
```bash
ls node_modules/@montage-ui/core/dist/components/              # 컴포넌트 목록
cat node_modules/@montage-ui/core/dist/components/<이름>/types.d.ts   # props
grep -rhoE "semantic\.[a-z]+\.[a-z]+\.[a-z]+" node_modules/@montage-ui/core/dist | sort -u   # 색 토큰
ls node_modules/@montage-ui/icon/dist                           # 아이콘
```
- 하위 컴포넌트보다 **부모**(Modal, Card, Tab …) 타입을 보면 구성 전체가 보인다
- 문서 사이트: https://montage.wanted.co.kr

## 2. 고르는 순서
1. Montage에 같은 · 비슷한 컴포넌트가 있나 → 있으면 그대로
2. 없으면 Montage 컴포넌트 위에 조립
3. props(size · color · variant) 먼저, `sx`는 props로 안 될 때만

**손으로 그리기 전에 확인** (원시 요소는 배치에만):
| 그리려는 것 | 먼저 쓸 것 |
| --- | --- |
| 섹션 제목, 페이지 머리 | `SectionHeader` (`_components/section-title`, `page-header`) |
| 테두리 묶음 상자 | 공용 `Panel` (`src/components/panel`). `Card`는 썸네일 콘텐츠 카드라 묶음 상자로 쓰지 않음 |
| 표 | `Table` (직접 `table` 금지) |
| 글머리표 목록에 버튼, 출처가 붙음 | `List` + `ListCell` |
| 확인 창, 복사 알림 | `Alert`, `Toast` (`window.confirm` 금지) |
| 진행 단계 | `ProgressTracker` |
"없다"고 쓰기 전에 `ls node_modules/@montage-ui/core/dist/components/`로 확인한다.

## 3. 레이아웃
| 용도 | 쓸 것 |
| --- | --- |
| 한 방향 배치 | `FlexBox` |
| 12칸 그리드 | `Grid` + `GridItem` |
| 페이지 폭 | `containerStyle()` |
| 일반 래퍼 | `Box` |

간격은 토큰 말고 px: 컴포넌트 사이 12–16px · 섹션 사이 24–32px · 페이지 구역 40–48px.
반응형: props만 바뀌면 `sm={{...}}`, CSS가 바뀌면 `respondTo`, 렌더가 바뀌면 `useMediaQuery`. 모바일 먼저.

## 4. 스타일 · 토큰
- `sx` 1–3줄은 인라인, 4줄 이상은 `style.ts`로
- 색: `sx={theme => ({ color: theme.semantic.foreground.neutral.primary })}` 또는 `color="semantic.foreground.neutral.secondary"`
- **`#RRGGBB` 와 `var(--semantic-...)` 직접 사용 금지**
- Montage에 자리가 없는 Hatch 색(주 행동 오렌지, 강조 옐로)만 `hatchColor`(`@/lib/theme/tokens`)로. 배경과 글자를 짝으로 쓴다
- 색 값은 `src/app/theme.css` 한 곳. 승인된 대비 조합만 쓴다 (spec `2026-11-02-color-system`). 글자에 투명도 금지
- 타이포: `Typography`의 `variant`(예: `title1`, `body1`) · `weight`
- 그림자 `theme.semantic.elevation.shadow.normal.*` · 투명도 `addOpacity(색, theme.opacity[N])`
- Montage는 Emotion 기반 → 쓰는 컴포넌트 파일에 `'use client'`

## 5. TDS
화면 패턴(목록 · 바텀시트 흐름 등)과 문구 톤만 참고. TDS 패키지 · 토큰은 넣지 않는다.

## 끝나면 확인
- [ ] 직접 만든 것 중 Montage에 있던 게 없나
- [ ] 하드코딩 색 · CSS 변수 없음 (Hatch 색은 `hatchColor`)
- [ ] 색만으로 상태를 알리지 않음 (라벨이나 모양이 같이)
- [ ] 아이콘은 `@montage-ui/icon`
- [ ] `npm run lint && npm run typecheck`
