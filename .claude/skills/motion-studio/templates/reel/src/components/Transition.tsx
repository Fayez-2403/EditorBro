// Transitions centred on each cut (k = frames from the cut; negative before it). Give EVERY cut a reason and vary the
// kind per reel world; never the same transition on every cut. Add the reel's own kinds here.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { clamp, easeInQuint, easeOutQuint } from '../animation/anim';
import { C } from '../themes/tokens';

export type Kind = 'cut' | 'wipe' | 'flash' | 'push';

export const Transition: React.FC<{ kind: Kind; k: number }> = ({ kind, k }) => {
  if (kind === 'cut' || k < -12 || k > 14) return null;
  if (kind === 'flash') {
    const a = k < 0 ? clamp((k + 6) / 6) : Math.exp(-k / 5);
    return <AbsoluteFill style={{ zIndex: 60, background: `rgba(255,250,240,${a})` }} />;
  }
  if (kind === 'wipe') {  // a panel crosses the cut: accelerates in, decelerates out
    // full cover holds 4 frames (k -2..1) so the cut reads as deliberate, never a one-frame strobe
    const x = k < -2 ? -1080 + 1080 * easeInQuint(clamp((k + 12) / 10)) : k <= 1 ? 0 : 1080 * easeOutQuint(clamp((k - 1) / 13));
    return <AbsoluteFill style={{ zIndex: 60 }}><div style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1080, background: `repeating-linear-gradient(115deg, ${C.accent} 0 60px, #2BC7B9 60px 120px), linear-gradient(180deg, ${C.accent}, #1E8F86)`, backgroundBlendMode: 'multiply' }} /></AbsoluteFill>;
  }
  // push: handled by the scenes (camera move across the cut); a faint motion smear here
  const a = clamp(1 - Math.abs(k) / 8) * 0.25;
  return <AbsoluteFill style={{ zIndex: 60, background: `linear-gradient(90deg, transparent, rgba(0,0,0,${a}), transparent)` }} />;
};
