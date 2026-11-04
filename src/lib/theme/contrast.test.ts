import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrast';

// theme.css의 실제 값으로 spec 2026-11-03 mono-montage 2절 대비를 다시 계산한다
const css = readFileSync(path.resolve(__dirname, '../../app/theme.css'), 'utf8');
const montage = readFileSync(path.resolve(__dirname, '../../../node_modules/@montage-ui/core/dist/theme.css'), 'utf8');

function vars(source: string, match: (selector: string) => boolean): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [, selector, body] of source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!match(selector)) continue;
    for (const [, k, v] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) map[k] = v.trim();
  }
  return map;
}

// Montage 라이트 기본값 위에 Hatch가 바꾼 것을 얹는다 (화면과 같은 순서)
const light = { ...vars(montage, (s) => s.includes(':root')), ...vars(css, (s) => s.includes(':root')) };

function hex(name: string): string {
  if (name.startsWith('#')) return name;
  if (name.startsWith('mix:')) return mix(name.slice(4));
  const v = light[`--${name}`];
  const ref = v?.match(/^var\((--[\w-]+)\)$/);
  return ref ? hex(ref[1].slice(2)) : v?.startsWith('#') ? v.toUpperCase() : v;
}

// 반투명 Montage 색(#RRGGBBAA)을 흰 바탕에 섞은 불투명 색. 'mix:<변수>'로 쓴다
function mix(name: string): string {
  const v = hex(name);
  const a = v.length === 9 ? parseInt(v.slice(7), 16) / 255 : 1;
  const ch = [1, 3, 5].map((j) => Math.round(parseInt(v.slice(j, j + 2), 16) * a + 255 * (1 - a)));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

const AA_TEXT = 4.5;
const WHITE = 'semantic-background-neutral-primary';

// [글자 또는 선, 바탕, 기대 대비, 기준]
const pairs: [string, string, number, number][] = [
  ['semantic-foreground-neutral-primary', WHITE, 17.9, AA_TEXT],
  ['semantic-foreground-neutral-secondary', WHITE, 9.13, AA_TEXT],
  ['semantic-foreground-neutral-tertiary', WHITE, 5.49, AA_TEXT],
  ['semantic-foreground-neutral-quaternary', WHITE, 5.49, AA_TEXT],
  // 세그먼트 트랙, 칩 바탕(Montage surface-neutral-secondary, 반투명) 위 3번째 글자
  ['semantic-foreground-neutral-tertiary', 'mix:semantic-surface-neutral-secondary', 4.99, AA_TEXT],
  ['semantic-foreground-neutral-tertiary', 'semantic-background-neutral-secondary', 5.13, AA_TEXT],
  ['semantic-static-white', 'semantic-surface-brand-primary', 17.9, AA_TEXT],
  ['semantic-foreground-brand-primary', WHITE, 17.9, AA_TEXT],
  ['semantic-foreground-negative-primary', WHITE, 17.9, AA_TEXT],
  ['highlight-text', 'highlight-bg', 14.53, AA_TEXT],
  ['highlight-mark', WHITE, 4.87, AA_TEXT],
];

describe('contrastRatio', () => {
  it('검정/흰색은 21, 같은 색은 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#19171D', '#19171D')).toBe(1);
  });
});

describe('라이트 승인 조합', () => {
  it.each(pairs)('%s / %s = %s', (fg, bg, expected, min) => {
    // 반투명 값은 대비가 달라지므로 받지 않는다 (섞어야 하는 바탕은 mix:로 명시)
    for (const v of [hex(fg), hex(bg)]) expect(v, `${fg} / ${bg}`).toMatch(/^#[0-9A-F]{6}$/);
    const ratio = contrastRatio(hex(fg), hex(bg));
    expect(ratio.toFixed(2)).toBe(expected.toFixed(2));
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

describe('Montage 위에 얹기', () => {
  const ours = vars(css, (s) => s.includes(':root'));
  const semantic = Object.keys(ours).filter((k) => k.startsWith('--semantic-'));

  it('Montage에 있는 변수만 바꾼다 (이름 오타 방지)', () => {
    for (const k of semantic) expect(montage.includes(`${k}:`), k).toBe(true);
  });

  it('바탕, 면 변수는 덮어쓰지 않는다 (회색 면 금지, spec 2절)', () => {
    expect(semantic.filter((k) => /--semantic-(background|surface)-neutral|--semantic-surface-elevated/.test(k))).toEqual([]);
  });

  it('선은 Montage 기본 그대로 둔다 (#111, 옅은 1px 선)', () => {
    expect(semantic.filter((k) => k.startsWith('--semantic-line-neutral-'))).toEqual([]);
  });

  it('글자는 불투명이고 -rgb 짝이 같은 색이다', () => {
    for (const k of semantic.filter((k) => k.startsWith('--semantic-foreground-') && !k.endsWith('-rgb'))) {
      const value = hex(k.slice(2));
      expect(value, k).toMatch(/^#[0-9A-F]{6}$/);
      const rgb = [1, 3, 5].map((j) => parseInt(value.slice(j, j + 2), 16)).join(', ');
      expect(hex(`${k.slice(2)}-rgb`), k).toBe(rgb);
    }
  });
});
