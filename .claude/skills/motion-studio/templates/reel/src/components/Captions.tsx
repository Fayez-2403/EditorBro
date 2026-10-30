// Word-level burned-in captions from the REAL voice timings (SCENE_TIMINGS captions). Max two short lines, groups of
// <= 5 words, the spoken word lifts; keywords take the accent. Sits inside the safe area and off important footage
// (move `top` per scene via the `top` prop if a clip's UI is there).
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TIMINGS } from '../config/version';
import { clamp, easeOutQuint, invLerp } from '../animation/anim';
import { C, FONT, FPS, ink } from '../themes/tokens';

interface Word { w: string; t0: number; t1: number }
interface Cap { t0: number; t1: number; words: Word[] }
const CAPS: Cap[] = (TIMINGS as unknown as { variants: { reel: { captions: Cap[] } } }).variants.reel.captions;
const GROUPS: Word[][] = CAPS.flatMap((c) => {
  const n = Math.ceil(c.words.length / 5), size = Math.ceil(c.words.length / n), out: Word[][] = [];
  for (let i = 0; i < c.words.length; i += size) out.push(c.words.slice(i, i + size));
  return out;
});

export const Captions: React.FC<{ keyword?: RegExp; top?: number }> = ({ keyword = /^$/, top = 1400 }) => {
  const t = useCurrentFrame() / FPS;
  const i = GROUPS.findIndex((g, k) => t >= g[0].t0 - 0.05 && t < Math.min(g[g.length - 1].t1 + 0.4, (GROUPS[k + 1]?.[0].t0 ?? 1e9) - 0.05));
  if (i < 0) return null;
  const g = GROUPS[i], p = easeOutQuint(invLerp(g[0].t0 - 0.05, g[0].t0 + 0.12, t));
  return (
    <div style={{ position: 'absolute', left: 110, right: 110, top, display: 'flex', justifyContent: 'center', zIndex: 40 }}>
      <div style={{ textAlign: 'center', padding: '10px 24px', borderRadius: 16, background: C.card, border: `4px solid ${C.ink}`, boxShadow: ink(6),
        opacity: clamp(p * 1.5), transform: `translateY(${(1 - p) * 16}px)`, fontFamily: FONT.display, fontStretch: '86%', fontWeight: 800, fontSize: 56, lineHeight: 1.1 }}>
        {g.map((w, k) => {
          const spoken = t >= w.t0 - 0.03, pp = 1 - clamp((t - w.t0 + 0.03) / 0.16);
          return (
            <React.Fragment key={k}>
              <span style={{ display: 'inline-block', color: spoken ? (keyword.test(w.w) ? C.accent : C.ink) : C.ink2,
                transform: spoken && pp > 0 ? `translateY(${-5 * pp}px) scale(${1 + 0.08 * pp})` : undefined }}>{w.w}</span>
              {k < g.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
