# 컬러 시스템: 접근성 있는 라이트, 다크 테마 (2026-11-02)

사용자 요청: Hatch 전체 컬러 시스템을 WCAG 2.2 AA 대비 기준(https://www.w3.org/TR/WCAG22/)에 맞춰 라이트, 다크로 설계하고 적용한다.
이번 단계는 **색과 테마 적용만** 한다. 아이콘, 로고는 만들거나 바꾸지 않는다.
사용자가 준 색 코드, 대비 수치, 사용 비율은 바꾸지 않는다. 아래 1~3절은 요구 원문을 표로 옮긴 것이다.
대비 수치는 색 대비 기준일 뿐이다. 제품 전체의 AA 적합성(키보드 탐색, 포커스 표시 등)은 따로 본다.

## 1. 브랜드 팔레트

| 이름 | 코드 | 역할 |
| --- | --- | --- |
| Night Ink | `#19171D` | 로고, 본문 잉크, 다크 기본 배경 |
| Signal Orange | `#FF4D24` | 주 행동, 핵심 강조 |
| Action Cobalt | `#344BFF` | 링크, 보조 행동 |
| Flash Yellow | `#F6D84A` | 작은 강조, 주의 배지 |
| Electric Lilac | `#E7E5FF` | 라이트 보조 표면 |
| Warm White | `#FFFDF7` | 라이트 기본 표면 |
| Secondary Slate | `#625E6A` | 라이트 보조 본문 |
| Dark Surface | `#242229` | 다크 카드 표면 |
| Dark Elevated | `#302D35` | 다크 상위 레이어 |
| Dark Secondary Text | `#B8B4C0` | 다크 보조 본문 |
| Light Border | `#827E8A` | 라이트 경계선 |
| Dark Border | `#817D87` | 다크 경계선 |

## 2. 토큰 (CSS 변수)

이름은 요구 원문 그대로 쓴다. `—`는 그 모드에 없는 토큰이다.

| 토큰 | 라이트 | 다크 |
| --- | --- | --- |
| `--bg-default` | `#FFFDF7` | `#19171D` |
| `--surface-primary` | — | `#242229` |
| `--surface-secondary` | `#E7E5FF` | — |
| `--surface-elevated` | — | `#302D35` |
| `--text-primary` | `#19171D` | `#FFFDF7` |
| `--text-secondary` | `#625E6A` | `#B8B4C0` |
| `--border` | `#827E8A` | `#817D87` |
| `--action-primary-bg` | `#FF4D24` | `#FF4D24` |
| `--action-primary-text` | `#19171D` | `#19171D` |
| `--action-secondary-bg` | `#344BFF` | `#344BFF` |
| `--action-secondary-text` | `#FFFDF7` | `#FFFDF7` |
| `--highlight-bg` | `#F6D84A` | `#F6D84A` |
| `--highlight-text` | `#19171D` | `#19171D` |

```css
:root {
  --bg-default: #FFFDF7;
  --surface-secondary: #E7E5FF;
  --text-primary: #19171D;
  --text-secondary: #625E6A;
  --border: #827E8A;
  --action-primary-bg: #FF4D24;
  --action-primary-text: #19171D;
  --action-secondary-bg: #344BFF;
  --action-secondary-text: #FFFDF7;
  --highlight-bg: #F6D84A;
  --highlight-text: #19171D;
}
html[data-theme='dark'] {
  --bg-default: #19171D;
  --surface-primary: #242229;
  --surface-elevated: #302D35;
  --text-primary: #FFFDF7;
  --text-secondary: #B8B4C0;
  --border: #817D87;
  --action-primary-bg: #FF4D24;
  --action-primary-text: #19171D;
  --action-secondary-bg: #344BFF;
  --action-secondary-text: #FFFDF7;
  --highlight-bg: #F6D84A;
  --highlight-text: #19171D;
}
```

## 3. 승인된 조합과 대비

WCAG 상대 휘도 공식(sRGB 선형화, `(L1+0.05)/(L2+0.05)`)으로 직접 계산했다.
**15개 모두 사용자 수치와 소수 둘째 자리까지 같다.** 다른 값은 없다.

| 앞(글자, 선) | 뒤(배경) | 사용자 | 계산 | 일반 글자 4.5 | 큰 글자 3 | UI 경계 3 |
| --- | --- | --- | --- | --- | --- | --- |
| 잉크 `#19171D` | 웜화이트 `#FFFDF7` | 17.47 | 17.47 | 통과 | 통과 | 통과 |
| 잉크 | 라일락 `#E7E5FF` | 14.43 | 14.43 | 통과 | 통과 | 통과 |
| 슬레이트 `#625E6A` | 웜화이트 | 6.20 | 6.20 | 통과 | 통과 | 통과 |
| 슬레이트 | 라일락 | 5.12 | 5.12 | 통과 | 통과 | 통과 |
| 코발트 `#344BFF` | 웜화이트 | 5.74 | 5.74 | 통과 | 통과 | 통과 |
| 코발트 | 라일락 | 4.74 | 4.74 | 통과 | 통과 | 통과 |
| 잉크 | 오렌지 `#FF4D24` | 5.36 | 5.36 | 통과 | 통과 | 통과 |
| 잉크 | 옐로 `#F6D84A` | 12.56 | 12.56 | 통과 | 통과 | 통과 |
| 웜화이트 | 코발트 | 5.74 | 5.74 | 통과 | 통과 | 통과 |
| 웜화이트 | 잉크 | 17.47 | 17.47 | 통과 | 통과 | 통과 |
| 오렌지 | 다크 기본 `#19171D` | 5.36 | 5.36 | 통과 | 통과 | 통과 |
| 옐로 | 다크 상위 `#302D35` | 9.56 | 9.56 | 통과 | 통과 | 통과 |
| 다크 보조 `#B8B4C0` | 다크 상위 `#302D35` | 6.65 | 6.65 | 통과 | 통과 | 통과 |
| 라이트 경계 `#827E8A` | 라일락 | 3.22 | 3.22 | (해당 없음) | — | 통과 |
| 다크 경계 `#817D87` | 다크 상위 `#302D35` | 3.36 | 3.36 | (해당 없음) | — | 통과 |

### 피할 조합 (계산 확인)
| 조합 | 대비 | 이유 |
| --- | --- | --- |
| 오렌지 글자 / 웜화이트 | 3.26 | 일반 글자 실패 |
| 오렌지 글자 / 라일락 | 2.69 | 실패 |
| 코발트 글자 / 옐로 | 4.13 | 일반 글자 실패 |
| 옐로 글자 / 웜화이트 | 1.39 | 실패 |
| 회색 본문에 투명도 | — | 배경에 따라 대비가 바뀐다 |
| 오렌지, 코발트, 옐로를 한 컴포넌트에 모두 강하게 | — | 강조가 서로 싸운다 |

### 승인 목록 밖인데 화면에 꼭 생기는 조합 (보고, 승인 필요)
Montage 구조상 아래 조합은 피할 수 없다. 계산하면 모두 기준을 넘지만 **승인 목록에는 없다.** 추가 승인을 받거나 대안을 정해야 한다.

| 조합 | 대비 | 기준 | 왜 생기나 |
| --- | --- | --- | --- |
| 다크 본문 `#FFFDF7` / 다크 표면 `#242229` | 15.45 | 일반 글자 통과 | 다크 카드(15%) 위 본문 |
| 다크 본문 `#FFFDF7` / 다크 상위 `#302D35` | 13.30 | 일반 글자 통과 | 모달, 팝오버 위 본문 |
| 다크 보조 `#B8B4C0` / 다크 기본 `#19171D` | 8.74 | 일반 글자 통과 | 화면 바탕 위 보조 글 |
| 다크 보조 `#B8B4C0` / 다크 표면 `#242229` | 7.73 | 일반 글자 통과 | 카드 위 보조 글 |
| 라이트 경계 `#827E8A` / 웜화이트 | 3.89 | UI 경계 통과 | 입력칸, 외곽선 버튼은 대개 웜화이트 위 |
| 다크 경계 `#817D87` / 다크 기본 `#19171D` | 4.41 | UI 경계 통과 | 화면 바탕 위 입력칸 |
| 다크 경계 `#817D87` / 다크 표면 `#242229` | 3.91 | UI 경계 통과 | 카드 위 입력칸 |

### 쓰지 않는 조합 (계산상 막힘)
| 조합 | 대비 | 결과 |
| --- | --- | --- |
| 흰 글자 `#FFFFFF` / 오렌지 | 3.31 | Montage 기본 채움 버튼 글자색. 오렌지 버튼에 쓰면 실패 → 5절 |
| 코발트 글자 / 다크 기본 | 3.04 | 다크에서 코발트 링크 글자 불가 → 4절 D2 |
| 코발트 / 다크 표면 | 2.69 | 다크에서 코발트 선, 포커스 불가 |
| 오렌지 글자 / 다크 상위 `#302D35` | 4.08 | 일반 글자 실패. 오렌지 글자는 다크 기본 배경 위에서만 |
| Montage 상태색(빨강 `#FF4242`, 초록 `#00BF40`, 주황 `#FF9200`) / 웜화이트 | 3.38, 2.42, 2.20 | 지금도 흰 배경에서 실패. 팔레트에도 없음 → 4절 D3 |

## 4. Montage에 넣는 방법

### 조사 결과 (`@montage-ui/core` 4.1.5)
- `ThemeProvider`는 테마 객체를 받지 않는다. `@montage-ui/theme`의 고정 객체를 쓰고, 그 값은 전부 `var(--semantic-…)` 문자열이다
  (`theme.light.semantic.foreground.neutral.primary === 'var(--semantic-foreground-neutral-primary)'`)
- 실제 색은 `@montage-ui/core/global.css` 안 `:root`(라이트)와 `html[data-theme='dark']`(다크)의 CSS 변수에 있다
- 그래서 **CSS 변수를 덮어쓰는 것**이 Montage가 허용하는 유일한 테마 교체 방법이다. 같은 선택자로 `global.css` 뒤에 불러오면 이긴다
- 다크 모드: `ThemeProvider enableDarkMode`를 켜면 시스템 설정을 따르고, `useThemeControl().setTheme('light'|'dark'|'system')`으로 바꾸며 쿠키(`montage-theme`)에 저장된다. `<html data-theme>`를 Montage가 바꾼다
- Montage `addOpacity(색, 투명도)`는 `var(--x)`를 `rgba(var(--x-rgb), a)`로 바꿔 쓴다 (`core/dist/utils/color.mjs`). 그래서 값 변수마다 `-rgb` 짝도 같이 덮어쓴다. 처음 조사에서 "안 쓴다"고 잘못 봤다가 화면 검사에서 Montage 파랑 틴트가 남아 찾았다
- 우선순위: Montage 다크 값은 `html[data-theme='dark']`(0,1,1)라 `:root`(0,1,0)보다 세다. 그래서 라이트 매핑 블록에 다크 선택자를 같이 걸고, 다크에서 다른 값만 그 뒤 다크 블록이 다시 쓴다
- Montage는 `body` 배경만 칠하고 글자색은 주지 않는다. 색을 안 준 글자(로고 등)가 `#000`이 되지 않게 `body { color: var(--text-primary) }`를 둔다

### 파일 구성
- `src/app/theme.css`: 2절 토큰 정의 + 아래 매핑. **hex는 이 파일에만** 둔다 (Montage의 `theme.css`와 같은 자리)
- `layout.tsx`: `@montage-ui/core/global.css` 다음, `globals.css` 앞에 `./theme.css`를 불러온다
- `src/lib/theme/tokens.ts`: Montage에 자리가 없는 역할(주 행동 오렌지, 강조 옐로)을 `'var(--action-primary-bg)'` 같은 문자열 상수로 낸다. 컴포넌트는 이 상수만 쓴다
- `src/lib/theme/contrast.ts` + 테스트: `theme.css`를 읽어 3절 승인 조합의 대비를 계산하고, 수치가 표와 같고 기준을 넘는지 검사한다 (색이 바뀌면 테스트가 깨진다).
  Montage가 다크에서 정의하는 색 변수가 라이트, 다크 모두에서 빠짐없이 덮어써져 불투명 팔레트 색과 `-rgb` 짝으로 풀리는지도 본다

### Montage 변수 매핑
| Montage 변수 | 라이트 | 다크 | 비고 |
| --- | --- | --- | --- |
| `background-neutral-primary` | `--bg-default` | `--bg-default` | 화면 바탕 |
| `background-neutral-secondary` | `--surface-secondary` | `--surface-primary` | 넓은 화면 바깥 띠, 카드 호버 |
| `surface-elevated-primary`, `-secondary` | `--bg-default` | `--surface-elevated` | 모달, 팝오버 |
| `surface-neutral-primary` | `--bg-default` | `--surface-primary` | |
| `surface-neutral-secondary`, `-tertiary`, `-strong` | `--surface-secondary` | `--surface-elevated` | 지금 반투명. 불투명으로 바꾼다 |
| `foreground-neutral-primary`, `-strong` | `--text-primary` | `--text-primary` | |
| `foreground-neutral-secondary`, `-tertiary`, `-quaternary` | `--text-secondary` | `--text-secondary` | 지금 반투명(E0, 9C, 47). **텍스트 투명도 제거** |
| `foreground-neutral-inverse` | `#FFFDF7` | `#19171D` | 반전 글자 |
| `surface-neutral-inverse` | `#19171D` | `#FFFDF7` | 반전 배경 (웜화이트/잉크 17.47) |
| `line-neutral-*` (Opaque 포함) | `--border` | `--border` | 지금 반투명. 3:1 경계로 |
| `static-white` | `#FFFDF7` | `#FFFDF7` | Montage 채움 버튼, 스위치 글자색. 웜화이트로 맞춰 승인 조합이 된다 |
| `surface-brand-primary` (+`strong`, `heavy`) | `--action-secondary-bg` | `--action-secondary-bg` | Montage 채움 버튼 = 보조 행동 코발트 (웜화이트 글자 5.74) |
| `foreground-brand-primary` | 코발트 | D2 결정 | 링크, 선택된 탭 글자, 체크 |
| `line-brand-*` (포커스) | 코발트 | D2 결정 | |
| `foreground-disable-primary` | `--text-secondary` | `--text-secondary` | 반투명 제거. 비활성은 배경, 커서, `aria-disabled`로 구분 |
| 상태색 (`negative`, `positive`, `cautionary`) | D3 결정 | D3 결정 | |
| 강조색 `accent-*` 글자 | `--text-primary` | `--text-primary` | ContentBadge 기본(cyan `#0098B2`, 웜화이트 위 실패). 코발트로 두면 라일락 위 틴트에서 4.26이라 본문색 |
| 강조색 `accent-*` 표면, 선 | `--surface-secondary`, `--border` | `--surface-elevated`, `--border` | |

모든 행에 `-rgb` 짝이 같이 붙는다.

### Montage가 만드는 반투명 틴트
Montage 일부 컴포넌트는 매핑된 색에 투명도를 줘 배경을 만든다. 글자 투명도가 아니라 배경이고, 그 위 글자 대비를 계산했다.

| 자리 | 배경 (계산) | 글자 | 대비 |
| --- | --- | --- | --- |
| SectionMessage 정보 | 코발트 5% / 웜화이트 | 잉크 | 16.22 |
| SectionMessage 오류, 주의 | 잉크 5% / 웜화이트 | 잉크 | 15.88 |
| ContentBadge 강조 | 잉크 8% / 웜화이트 | 잉크 | 14.92 |
| ContentBadge 강조 (다크) | 웜화이트 8% / 잉크 | 웜화이트 | 14.15 |
| ContentBadge 강조 (다크 카드) | 웜화이트 8% / 다크 표면 | 웜화이트 | 12.09 |

`elevation`(그림자), `effect.dimmer`(모달 뒤 어둡게)는 색 대비 대상이 아니라 그대로 둔다.

### 결정이 필요한 것
- **D1. Hatch 토큰 상수 허용.** 지금 규칙(`montage-ui` 스킬)은 Montage 토큰만 허용한다. 오렌지 주 행동과 옐로 강조는 Montage에 자리가 없다.
  제안: `src/lib/theme/tokens.ts`의 상수만 추가로 허용하고, 스킬 4절에 한 줄 적는다. hex와 `var(--…)` 직접 사용 금지는 그대로.
- **D2. 다크 모드 링크, 포커스 색.** 코발트 글자는 다크 배경에서 3.04로 실패하고, 다크용 밝은 코발트는 팔레트에 없다.
  제안: 다크에서 `foreground-brand-primary`와 포커스 선은 `--text-primary`(웜화이트)로 두고, 링크는 밑줄, 선택 탭은 Montage 밑줄 표시로 구분한다.
  다른 안: 오렌지 글자(다크 기본 위 5.36 승인). 다만 카드(4.75, 미승인), 모달(4.08, 실패) 위에서는 못 써서 Montage 내부 배치를 통제할 수 없다.
- **D3. 상태색.** 지금 쓰는 빨강, 초록, 주황은 팔레트에 없고 웜화이트 위에서 실패한다. 새 색을 만들면 "제공한 색 그대로" 원칙을 깬다.
  제안: 상태 글자는 `--text-primary`로, 상태 표면(`surface-negative` 등)은 `--surface-secondary`/`--surface-elevated`로 바꾸고,
  상태는 **라벨과 모양**으로 전한다 (SectionMessage 아이콘, "오류" 같은 글자, ▲▼ 기호, 필수 표시 `*`는 "필수" 라벨 유지).
  주의는 예외로 옐로 배지(`--highlight-bg` + `--highlight-text` 12.56)를 쓴다.
  다른 안: 오류에만 웜화이트 배경에서 통과하는 Montage `negative.strong #E52222`(4.50)를 남긴다. 단 팔레트 밖 색이다.
- **D4. 승인 목록 밖 조합 7개** (3절 표). 모두 계산상 통과한다. 제안: 승인 목록에 추가. 안 하면 다크 카드 위 본문을 쓸 수 없다.

## 5. 화면에 적용할 것

| 자리 | 지금 | 바뀐 뒤 |
| --- | --- | --- |
| 화면 바탕, 카드 | Montage 흰색, 회색 | 웜화이트, 라일락 (다크: 잉크, 다크 표면) |
| 본문, 보조 글 | 검정, 반투명 회색 | 잉크, 슬레이트 (불투명) |
| 주 행동 버튼 (아이디어 만들기, 문서 만들기 등 화면당 하나) | Montage 파랑 채움 | 오렌지 배경 + 잉크 글자 (`tokens.ts`) |
| 보조 행동 버튼 (Montage 채움 버튼 나머지) | 파랑 채움 | 코발트 배경 + 웜화이트 글자 |
| 외곽선 버튼, 입력칸 테두리 | 반투명 회색 선 | `--border` (3:1 이상) |
| "다시 만들어야 해요" 배지 | 주황 채움 | 옐로 배경 + 잉크 글자 + 라벨 |
| 문서 탭 진행 점 | 파랑, 주황 점 | 모양(체크, 점)과 글자 라벨은 그대로, 색만 토큰으로 |

규칙
- **한 컴포넌트에 강한 포인트색은 하나만.** 오렌지 버튼이 있는 카드에 옐로 배지, 코발트 채움 버튼을 같이 두지 않는다
- 면적 비율(라이트 웜화이트 72%, 라일락 16%, 잉크와 중립 텍스트, 경계 6%, 오렌지 3%, 코발트 2%, 옐로 1% / 다크 잉크 70%, 다크 표면 15%, 다크 상위 7%, 텍스트와 경계 4%, 오렌지 2%, 코발트 1%, 옐로 1%)은 가이드다. 중립 표면 90% 이상, 주 행동 오렌지는 화면당 하나로 지킨다. 화면 캡처로 눈으로 본다 (자동 측정은 안 한다)
- 색만으로 상태를 알리지 않는다. 모든 상태는 글자나 모양이 같이 있다
- 텍스트 투명도 금지. `addOpacity`를 글자색에 쓰지 않는다

## 6. 라이트, 다크 전환
- `ThemeProvider enableDarkMode`: 처음엔 시스템 설정을 따른다
- 좌측 네비 아래에 전환 메뉴: "시스템 설정 따르기", "라이트", "다크" 세 가지. 글자 라벨이 있고 지금 고른 것에 체크 표시
- 쿠키에 저장돼 새로고침해도 유지. 서버 첫 화면 깜빡임은 Montage 인라인 스크립트가 막는다 (`suppressHydrationWarning` 이미 있음)

## 7. PR 나누기 (각 400줄, 15파일 이하)
0. **이 spec** (문서만. 코드 PR과 합치면 400줄을 넘는다)
1. **토큰과 Montage 매핑**: `theme.css`, `layout.tsx` import, `tokens.ts`, 대비 계산 + 테스트, `montage-ui` 스킬 규칙(D1), why 기록. 라이트만 바뀐다 (다크는 아직 꺼짐)
2. **주 행동과 강조 색**: 주 행동 버튼 오렌지 적용, 주의 배지 옐로, 상태색 정리(D3), "한 컴포넌트 포인트색 하나" 점검
3. **다크 모드**: `enableDarkMode`, 전환 메뉴, 다크 화면 전체 확인과 손볼 곳

#89(확인 창, 복사 토스트)는 PR #99로 머지됐다. 2번은 그 뒤 main에서 시작한다.

## 8. 하지 않는 것
- 아이콘, 로고 제작과 변경 (로고 글자는 `--text-primary`를 따라 잉크가 될 뿐 모양은 그대로)
- 새 색 추가, 팔레트 수치 변경
- 키보드 탐색, 포커스 표시 모양 개선 (색 대비 밖의 AA 항목. Montage 포커스는 지금 12% 반투명 번짐이라 따로 봐야 한다 → 후속 과제)
- 그림자, 모달 뒤 어둡게 색

## 9. 검증
- 단위: `contrast.ts`가 15개 승인 조합 수치를 다시 계산해 표와 같은지, 기준을 넘는지
- 브라우저(데모 데이터, `HATCH_DATA_DIR` 임시 폴더): 홈, 아이디어 상세, 도구, 사용량 화면을 라이트, 다크에서 캡처. 전환 메뉴로 바꿔 보고 새로고침 유지 확인, 콘솔 오류 없음
- 계산된 글자색, 배경색을 `getComputedStyle`로 몇 곳 뽑아 승인 조합인지 대조
- `npm run lint && npm run typecheck && npm test && npm run build`
