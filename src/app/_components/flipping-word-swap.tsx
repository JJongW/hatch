'use client';

// componentry.dev "Flipping Word Swap"을 옮겼다 (gsap). 바꾼 점:
// - Tailwind 대신 인라인 스타일 (이 프로젝트는 Montage/Emotion)
// - button 대신 span + `swapped` prop — 로고 링크 안에 들어가서, 호버 · 포커스는 부모 링크가 정한다
import gsap from 'gsap';
import { useEffect, useRef } from 'react';

import type { CSSProperties } from 'react';

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const segment = (text: string) => (segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text));

const layer: CSSProperties = { gridArea: '1 / 1', display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'pre' };
const char: CSSProperties = { display: 'inline-block', whiteSpace: 'pre', backfaceVisibility: 'hidden', willChange: 'transform, opacity' };
// gsap이 붙기 전(서버 HTML · hydration 전)에도 두 번째 단어는 숨겨 둔다 — 없으면 두 단어가 겹쳐 보인다
const hiddenChar: CSSProperties = { ...char, opacity: 0 };

type Props = {
  word1: string;
  word2: string;
  swapped: boolean;
  /** 글자 하나가 뒤집히는 시간 (ms) */
  duration?: number;
  /** 옆 글자와의 시작 간격 (ms) */
  stagger?: number;
  style?: CSSProperties;
  toStyle?: CSSProperties;
};

export default function FlippingWordSwap({ word1, word2, swapped, duration = 400, stagger = 44, style, toStyle }: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const swappedRef = useRef(swapped);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const d = reduced ? 0 : Math.max(180, duration) / 1000;
    const s = reduced ? 0 : Math.max(0, stagger) / 1000;

    const ctx = gsap.context(() => {
      const first = gsap.utils.toArray<HTMLElement>('[data-flip-word="first"]');
      const second = gsap.utils.toArray<HTMLElement>('[data-flip-word="second"]');
      gsap.set(first, { rotationX: 0, opacity: 1, transformOrigin: 'center top' });
      gsap.set(second, { rotationX: -82, opacity: 0, transformOrigin: 'center bottom' });
      const tl = gsap.timeline({ paused: true });
      tl.to(first, { rotationX: 82, opacity: 0, duration: d, stagger: s, ease: 'power2.in' }).to(
        second,
        { rotationX: 0, opacity: 1, duration: d, stagger: s, ease: 'power2.out' },
        `<${d * 0.62}`,
      );
      if (swappedRef.current) tl.progress(1);
      timelineRef.current = tl;
    }, rootRef);

    return () => {
      timelineRef.current = null;
      ctx.revert();
    };
  }, [duration, stagger, word1, word2]);

  useEffect(() => {
    swappedRef.current = swapped;
    if (swapped) timelineRef.current?.play();
    else timelineRef.current?.reverse();
  }, [swapped]);

  const chars = (text: string, which: 'first' | 'second') =>
    segment(text).map((c, i) => (
      <span key={`${which}-${i}-${c}`} data-flip-word={which} style={which === 'second' ? hiddenChar : char}>
        {c === ' ' ? ' ' : c}
      </span>
    ));

  return (
    <span ref={rootRef} style={{ display: 'inline-grid', perspective: '800px', verticalAlign: 'baseline', ...style }}>
      <span aria-hidden="true" style={layer}>
        {chars(word1, 'first')}
      </span>
      <span aria-hidden="true" style={{ ...layer, ...toStyle }}>
        {chars(word2, 'second')}
      </span>
    </span>
  );
}
