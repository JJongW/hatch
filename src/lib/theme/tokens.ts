// Montage 토큰에 자리가 없는 Hatch 색 역할 (spec 2026-11-02 color-system D1).
// 값은 src/app/theme.css의 CSS 변수. 컴포넌트는 hex나 var(--…)를 직접 쓰지 말고 이 상수를 쓴다.
// 짝(배경 + 글자)으로만 쓴다: 오렌지 배경 위 잉크 글자 5.36, 옐로 배경 위 잉크 글자 12.56
export const hatchColor = {
  actionPrimary: { bg: 'var(--action-primary-bg)', text: 'var(--action-primary-text)' },
  highlight: { bg: 'var(--highlight-bg)', text: 'var(--highlight-text)' },
} as const;
