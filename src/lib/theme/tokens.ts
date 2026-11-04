// Montage 토큰에 자리가 없는 Hatch 색 역할 (spec 2026-11-03 mono-montage 2절).
// 값은 src/app/theme.css의 CSS 변수. 컴포넌트는 hex나 var(--…)를 직접 쓰지 말고 이 상수를 쓴다.
// 주 행동 버튼은 Montage Button(solid, primary)이 주색(검정)으로 그린다 → 따로 두지 않는다
// 라일락은 강조 하나. 배경으로 쓰고 짝(라일락 배경 + 검정 글자 14.53)으로 쓴다. 예외: mark(진한 라벤더)는 흰 바탕 위 작은 글자 표시에만
// (지금은 설문 필수 * 한 곳. 다른 곳에 쓰기 시작하면 spec 컬러 절에 역할을 적는다)
export const hatchColor = {
  highlight: { bg: 'var(--highlight-bg)', text: 'var(--highlight-text)', mark: 'var(--highlight-mark)' },
} as const;

// 주의 배지, 작은 강조: 라일락 배경 + 검정 글자. 글자 라벨과 같이 쓴다 (색만으로 알리지 않는다)
export const highlightSx = { color: hatchColor.highlight.text, backgroundColor: hatchColor.highlight.bg, boxShadow: 'none' };
