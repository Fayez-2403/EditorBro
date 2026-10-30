// Scene registry: one component per scene id in SCENE_TIMINGS (the ids come from voScript.json "scene" / "cut").
// Each scene gets its local frame f (0 at its start) and its length n. A scene with no component yet shows a
// clearly labelled PLACEHOLDER, so a missing scene can never pass for finished work.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT } from '../themes/tokens';
import { easeOutQuint, invLerp } from '../animation/anim';
import { Cta } from './Cta';
import { Prompt } from './Desk';
import { Docs } from './Docs';
import { Montage } from './Montage';
import { Pipeline } from './Pipeline';
import { Flip, Hook } from './Road';
import { Websites } from './Websites';

export interface SceneProps { f: number; n: number; id: string; t0: number }

const Placeholder: React.FC<SceneProps> = ({ f, n, id }) => {
  const p = easeOutQuint(invLerp(0, 18, f));
  return (
    <AbsoluteFill style={{ background: C.base, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${0.9 + 0.1 * p})`, opacity: p, textAlign: 'center', fontFamily: FONT.display, fontWeight: 900, color: C.ink }}>
        <div style={{ fontSize: 40, letterSpacing: 6, color: C.warn }}>PLACEHOLDER</div>
        <div style={{ fontSize: 120, fontStretch: '80%' }}>{id.toUpperCase()}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink2 }}>{(f / 60).toFixed(2)} / {(n / 60).toFixed(2)} s</div>
      </div>
    </AbsoluteFill>
  );
};

export const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: Hook, flip: Flip, prompt: Prompt, pipeline: Pipeline, montage: Montage, websites: Websites, docs: Docs, cta: Cta,
};
export const sceneFor = (id: string): React.FC<SceneProps> => SCENES[id] ?? Placeholder;
