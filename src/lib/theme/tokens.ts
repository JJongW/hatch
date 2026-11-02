// Montage 토큰에 자리가 없는 Hatch 색 역할 (spec 2026-11-02 color-system D1).
// 값은 src/app/theme.css의 CSS 변수. 컴포넌트는 hex나 var(--…)를 직접 쓰지 말고 이 상수를 쓴다.
// 포인트 색은 라일락 하나. 배경으로만, 짝(라일락 배경 + 검정 글자 14.27)으로 쓴다
export const hatchColor = {
  actionPrimary: { bg: 'var(--action-primary-bg)', text: 'var(--action-primary-text)' },
  highlight: { bg: 'var(--highlight-bg)', text: 'var(--highlight-text)' },
} as const;

// 주 행동 버튼: Montage Button(solid, primary)의 sx. 화면에 하나만 둔다.
// 비활성은 Montage 모양(회색 글자, 회색 배경 5.79)을 그대로 쓴다
export const primaryActionSx = {
  '&:not(:disabled):not([aria-disabled="true"])': {
    color: hatchColor.actionPrimary.text,
    backgroundColor: hatchColor.actionPrimary.bg,
  },
};

// 주의 배지, 작은 강조: 라일락 배경 + 검정 글자. 글자 라벨과 같이 쓴다 (색만으로 알리지 않는다)
export const highlightSx = { color: hatchColor.highlight.text, backgroundColor: hatchColor.highlight.bg, boxShadow: 'none' };
