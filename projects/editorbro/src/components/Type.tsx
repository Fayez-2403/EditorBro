// Shared type pieces: the billboard gold lettering, a word that lands (decelerating, from bigger + blurred) and leaves
// (accelerating), and a typed line with a cursor. All pure functions of the absolute time T (seconds).
import React from 'react';
import { clamp, easeInCubic, easeOutQuint, invLerp } from '../animation/anim';
import { C, FONT } from '../themes/tokens';

/** gold painted lettering with the sign's brown outline (two layers: stroke behind, gradient fill in front) */
export const Gold: React.FC<{ children: string; size: number; weight?: number; style?: React.CSSProperties }> = ({ children, size, weight = 900, style }) => (
  <span style={{ position: 'relative', display: 'inline-block', fontFamily: FONT.brand, fontWeight: weight, fontSize: size, lineHeight: 1, ...style }}>
    <span style={{ position: 'absolute', inset: 0, color: C.brown, WebkitTextStroke: `${size * 0.075}px ${C.brown}`, transform: `translate(${size * 0.03}px, ${size * 0.045}px)`, opacity: 0.85 }}>{children}</span>
    <span style={{ position: 'absolute', inset: 0, color: C.brown, WebkitTextStroke: `${size * 0.07}px ${C.brown}` }}>{children}</span>
    <span style={{ position: 'relative', backgroundImage: 'linear-gradient(180deg, #FFF1B8 0%, #F2C35A 40%, #B9822C 100%)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{children}</span>
  </span>
);

/** 0..1 land progress and 0..1 leave progress for a word that lands at `at` and leaves at `out` */
export const landLeave = (T: number, at: number, out = 1e9, dIn = 0.45, dOut = 0.3) => ({
  inP: easeOutQuint(invLerp(at, at + dIn, T)),
  outP: easeInCubic(invLerp(out, out + dOut, T)),
});

/** a block that lands from 1.18x with deblur and leaves upward, accelerating */
export const Land: React.FC<{ T: number; at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number }> = ({ T, at, out, children, style, from = 1.18 }) => {
  const { inP, outP } = landLeave(T, at, out);
  if (inP <= 0) return null;
  return (
    <div style={{ ...style, opacity: clamp(inP * 1.6) * (1 - outP), filter: `blur(${(1 - inP) * 14 + outP * 10}px)`,
      transform: `${style?.transform ?? ''} translateY(${-outP * 160}px) scale(${from + (1 - from) * inP})` }}>{children}</div>
  );
};

/** text typed from t0 at cps characters per second, with a blinking block cursor */
export const Typed: React.FC<{ T: number; t0: number; text: string; cps?: number; cursor?: boolean; color?: string; style?: React.CSSProperties }> = ({ T, t0, text, cps = 40, cursor = true, color = C.ink, style }) => {
  const n = Math.max(0, Math.min(text.length, Math.floor((T - t0) * cps)));
  const blink = Math.floor(T * 2.4) % 2 === 0 || n < text.length;
  return (
    <span style={{ fontFamily: FONT.mono, color, whiteSpace: 'pre-wrap', ...style }}>
      {text.slice(0, n)}
      {cursor && T >= t0 - 0.4 ? <span style={{ display: 'inline-block', width: '0.6em', height: '1.05em', verticalAlign: '-0.15em', marginLeft: 2, background: blink ? color : 'transparent' }} /> : null}
    </span>
  );
};
