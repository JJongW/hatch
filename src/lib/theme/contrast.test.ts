import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';

// theme.css의 실제 값으로 spec 2026-11-02 color-system 3절 대비표를 다시 계산한다
const css = readFileSync(path.resolve(__dirname, '../../app/theme.css'), 'utf8');

// 다크에서는 Montage 다크 값(html[data-theme='dark'], 0,1,1)이 :root(0,1,0)를 이긴다.
// 그래서 다크 값은 다크 선택자가 들어 있는 블록에서만 읽는다 (선택자를 빠뜨리면 여기서 깨진다)
function vars(match: (selector: string) => boolean): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!match(selector.replace(/\/\*[\s\S]*?\*\//g, ''))) continue;
    for (const [, k, v] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) map[k] = v.trim();
  }
  return map;
}

const light = vars((s) => s.includes(':root'));
const dark = vars((s) => s.includes("html[data-theme='dark']"));

function hex(mode: Record<string, string>, name: string): string {
  const v = mode[`--${name}`];
  const ref = v?.match(/^var\((--[\w-]+)\)$/);
  return ref ? hex(mode, ref[1].slice(2)) : v;
}

type Pair = [fg: string, bg: string, expected: number, min: number];
const AA_TEXT = 4.5;
const UI = 3;

// 사용자 승인 15개
const approved: { light: Pair[]; dark: Pair[] } = {
  light: [
    ['text-primary', 'bg-default', 17.47, AA_TEXT],
    ['text-primary', 'surface-secondary', 14.43, AA_TEXT],
    ['text-secondary', 'bg-default', 6.2, AA_TEXT],
    ['text-secondary', 'surface-secondary', 5.12, AA_TEXT],
    ['action-secondary-bg', 'bg-default', 5.74, AA_TEXT],
    ['action-secondary-bg', 'surface-secondary', 4.74, AA_TEXT],
    ['action-primary-text', 'action-primary-bg', 5.36, AA_TEXT],
    ['highlight-text', 'highlight-bg', 12.56, AA_TEXT],
    ['action-secondary-text', 'action-secondary-bg', 5.74, AA_TEXT],
    ['border', 'surface-secondary', 3.22, UI],
  ],
  dark: [
    ['text-primary', 'bg-default', 17.47, AA_TEXT],
    ['action-primary-bg', 'bg-default', 5.36, AA_TEXT],
    ['highlight-bg', 'surface-elevated', 9.56, AA_TEXT],
    ['text-secondary', 'surface-elevated', 6.65, AA_TEXT],
    ['border', 'surface-elevated', 3.36, UI],
  ],
};

// 4절 D4로 추가 승인한 7개
const added: { light: Pair[]; dark: Pair[] } = {
  light: [['border', 'bg-default', 3.89, UI]],
  dark: [
    ['text-primary', 'surface-primary', 15.45, AA_TEXT],
    ['text-primary', 'surface-elevated', 13.3, AA_TEXT],
    ['text-secondary', 'bg-default', 8.74, AA_TEXT],
    ['text-secondary', 'surface-primary', 7.73, AA_TEXT],
    ['border', 'bg-default', 4.41, UI],
    ['border', 'surface-primary', 3.91, UI],
  ],
};

describe('contrastRatio', () => {
  it('검정/흰색은 21, 같은 색은 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#19171D', '#19171D')).toBe(1);
  });
});

describe.each([
  ['라이트', light, [...approved.light, ...added.light]],
  ['다크', dark, [...approved.dark, ...added.dark]],
] as const)('%s 승인 조합', (_, mode, pairs) => {
  it.each(pairs)('%s / %s = %s', (fg, bg, expected, min) => {
    const ratio = contrastRatio(hex(mode, fg), hex(mode, bg));
    expect(ratio.toFixed(2)).toBe(expected.toFixed(2));
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

// Montage가 다크에서 정의하는 색 변수 (그림자, 효과, 반전 static-black은 빼고) — 하나도 빠짐없이 덮어써야 한다
const montageDark = readFileSync(path.resolve(__dirname, '../../../node_modules/@montage-ui/core/dist/theme.css'), 'utf8');
const montageColors = [
  ...new Set(
    [...montageDark.slice(montageDark.indexOf("html[data-theme='dark']")).matchAll(/(--semantic-(?:foreground|background|surface|line)-[\w-]+|--semantic-static-white(?:-rgb)?):/g)].map((m) => m[1]),
  ),
];

describe('Montage 매핑', () => {
  it.each([
    ['라이트', light],
    ['다크', dark],
  ] as const)('%s: Montage 색 변수를 모두 덮어쓰고, 불투명 팔레트 색과 그 -rgb 짝으로 풀린다', (_, mode) => {
    expect(montageColors.length).toBeGreaterThan(100);
    for (const k of montageColors) {
      expect(mode[k], `${k} 빠짐`).toBeDefined();
      const value = hex(mode, k.replace(/-rgb$/, '').slice(2));
      expect(value, k).toMatch(/^#[0-9A-F]{6}$/);
      if (k.endsWith('-rgb')) {
        const rgb = [1, 3, 5].map((j) => parseInt(value.slice(j, j + 2), 16)).join(', ');
        expect(hex(mode, k.slice(2)), k).toBe(rgb);
      }
    }
  });
});
