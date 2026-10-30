// The desk (8.7-11.7 s): a dark room lit only by a terminal. "Main bas ek prompt likhta hoon" (8.85 s): the prompt
// types itself; Enter at 11.15 s and the line flares. The screen's light spills onto the desk and the back wall
// (after the Akshay reel: the screen lights the room).
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Typed } from '../components/Type';
import { clamp, easeOutQuint, invLerp } from '../animation/anim';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

export const PROMPT = 'Make a 55-second reel about my repo EditorBro. Hinglish voice, captions, original score. Facts only from the repo.';
const T_TYPE = 8.95, CPS = 52, T_ENTER = 11.15;

export const Terminal: React.FC<{ children: React.ReactNode; title?: string; width?: number; glow?: number }> = ({ children, title = '~/EditorBro — claude', width = 960, glow = 1 }) => (
  <div style={{ width, borderRadius: 30, background: 'linear-gradient(180deg, #0E1114, #090B0D)', border: '1.5px solid rgba(255,255,255,0.10)',
    boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 ${140 * glow}px ${30 * glow}px rgba(31,229,200,${0.10 * glow})`, overflow: 'hidden' }}>
    <div style={{ height: 70, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.85 }} />)}
      <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT.mono, fontSize: 24, color: C.ink2 }}>{title}</div>
      <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.teal, border: `1px solid ${C.teal}66`, borderRadius: 8, padding: '3px 10px' }}>Opus 5.5</div>
    </div>
    <div style={{ padding: '34px 38px 42px', fontFamily: FONT.mono, fontSize: 44, lineHeight: 1.4, color: C.ink }}>{children}</div>
  </div>
);

export const Prompt: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  const on = easeOutQuint(invLerp(8.7, 9.2, T));
  const flare = Math.exp(-Math.max(0, T - T_ENTER) * 4) * (T >= T_ENTER ? 1 : 0);
  return (
    <AbsoluteFill style={{ background: '#030405', overflow: 'hidden' }}>
      {/* back wall + desk lit by the screen */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 900px 700px at 540px 820px, rgba(31,229,200,${0.10 * on}), transparent 70%)` }} />
      <div style={{ position: 'absolute', left: -200, right: -200, top: 1330, bottom: -200, transform: 'perspective(900px) rotateX(62deg)', transformOrigin: '50% 0%',
        background: `radial-gradient(ellipse 620px 420px at 50% 0%, rgba(200,255,245,${0.22 * on + flare * 0.25}), rgba(31,229,200,${0.06 * on}) 45%, transparent 75%), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 120px)` }} />
      <div style={{ position: 'absolute', left: 60, top: 400, opacity: on, transform: `translateY(${(1 - on) * 40}px) scale(${0.96 + 0.04 * on})` }}>
        <Terminal glow={1 + flare * 2}>
          <div style={{ color: C.ink2 }}>$ claude</div>
          <div style={{ color: C.ink2, fontSize: 30, margin: '6px 0 30px' }}>Claude Code · project skills loaded</div>
          <div>
            <span style={{ color: C.teal }}>{'> '}</span>
            <Typed T={T} t0={T_TYPE} text={PROMPT} cps={CPS} cursor={T < T_ENTER} />
          </div>
          {T >= T_ENTER ? (
            <div style={{ marginTop: 30, fontSize: 32, color: C.teal, opacity: clamp((T - T_ENTER) * 5) }}>⏺ reel-pipeline · motion-studio · motionmaxxing</div>
          ) : null}
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};
