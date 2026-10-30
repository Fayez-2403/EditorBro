// CTA (46.5-54.9 s). After SaasWAVE (a giant key press is the hit) and Slate (UI lifts into 3D), ending on the road.
//   47.55 "EditorBro"            the gold painted wordmark lands; the repo URL types underneath
//   48.89 "Fork karo"            a 3D FORK key drops and is pressed; fork cards fan out
//   49.76 "clone karo"           git clone types in a terminal strip
//   52.0  "Link chahiye?"        flash to the highway: the billboard now says FORK IT (web/ reel.html?sign=cta)
//   53.12 "Comment karo EDITOR"  the keyword card lands
import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { Gold, Land, Typed } from '../components/Type';
import { clamp, dampedSpring, easeOutQuint, invLerp } from '../animation/anim';
import { mulberry32 } from '../animation/rng';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

export const REPO_URL = 'github.com/Fayez-2403/EditorBro';
const T_ROAD = 52.0, T_PRESS = 48.95;

const Key: React.FC<{ T: number }> = ({ T }) => {
  const drop = dampedSpring(T - 48.55, 14, 0.55);
  const press = T < T_PRESS ? 0 : Math.exp(-(T - T_PRESS) * 9);
  const down = T >= T_PRESS ? 22 * Math.exp(-(T - T_PRESS) * 6) : 0;
  if (T < 48.5) return null;
  const depth = 46 - down;
  return (
    <div style={{ position: 'absolute', left: 540 - 230, top: 980 - (1 - drop) * 500, width: 460, height: 230 + 46, opacity: clamp((T - 48.5) * 8) }}>
      {/* side (the key's depth) */}
      <div style={{ position: 'absolute', left: 0, top: depth, width: 460, height: 230, borderRadius: 44, background: '#7A5A1E' }} />
      {/* top */}
      <div style={{ position: 'absolute', left: 0, top: down, width: 460, height: 230, borderRadius: 44, background: 'linear-gradient(180deg, #FFE7A3, #F2C35A 55%, #D79E3C)',
        boxShadow: `inset 0 -10px 0 rgba(0,0,0,0.12), 0 ${30 - down}px ${60 - down}px rgba(0,0,0,${0.5 - press * 0.2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FONT.display, fontStretch: '80%', fontWeight: 900, fontSize: 120, color: C.brown, letterSpacing: 6 }}>FORK</span>
      </div>
    </div>
  );
};

const Burst: React.FC<{ T: number }> = ({ T }) => {
  const k = T - T_PRESS;
  if (k < 0 || k > 0.9) return null;
  const r = mulberry32(77);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      <circle cx={540} cy={1095} r={80 + k * 900} fill="none" stroke={C.gold} strokeWidth={10 * (1 - k / 0.9)} opacity={1 - k / 0.9} />
      {Array.from({ length: 22 }, (_, i) => {
        const a = r() * Math.PI * 2, v = 500 + r() * 700, d = v * k * (1 - k * 0.4);
        return <circle key={i} cx={540 + Math.cos(a) * d} cy={1095 + Math.sin(a) * d * 0.8} r={7 * (1 - k / 0.9)} fill={i % 2 ? C.teal : C.gold} />;
      })}
    </svg>
  );
};

const FORKS = ['you/EditorBro', 'your-team/EditorBro', 'your-studio/EditorBro'];

export const Cta: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  return (
    <AbsoluteFill style={{ background: C.base, overflow: 'hidden' }}>
      <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(242,195,90,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(242,195,90,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 800px 700px at 540px 700px, rgba(242,195,90,0.14), transparent 70%)' }} />
      <Land T={T} at={46.47} out={47.4} style={{ position: 'absolute', top: 470, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.display, fontStretch: '85%', fontWeight: 800, fontSize: 70, color: C.ink2 }}>
        Repo ka naam
      </Land>
      <Land T={T} at={47.5} from={1.3} style={{ position: 'absolute', top: 400, left: 0, right: 0, textAlign: 'center' }}>
        <Gold size={196}>EditorBro</Gold>
      </Land>
      {T >= 47.6 ? (
        <div style={{ position: 'absolute', top: 640, left: 0, right: 0, textAlign: 'center', fontSize: 40 }}>
          <Typed T={T} t0={47.75} text={REPO_URL} cps={34} color={C.ink} cursor={T < 49.6} />
        </div>
      ) : null}
      {/* the fork cards fan out behind the key */}
      {FORKS.map((name, i) => {
        const p = easeOutQuint(invLerp(T_PRESS + 0.1 + i * 0.12, T_PRESS + 0.6 + i * 0.12, T));
        if (p <= 0) return null;
        const ang = (i - 1) * 16 * p, dx = (i - 1) * 300 * p;
        return (
          <div key={name} style={{ position: 'absolute', left: 540 - 170 + dx, top: 860 - 40 * p, width: 340, padding: '14px 18px', borderRadius: 16, background: '#111418', border: `1.5px solid ${C.gold}66`,
            transform: `rotate(${ang}deg)`, opacity: clamp(p * 2), fontFamily: FONT.mono, fontSize: 24, color: C.ink, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <span style={{ color: C.gold }}>⑂ </span>{name}
          </div>
        );
      })}
      <Key T={T} />
      <Burst T={T} />
      {/* clone */}
      {T >= 49.6 ? (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1300, padding: '22px 28px', borderRadius: 20, background: '#0C0F12', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: 30,
          opacity: easeOutQuint(invLerp(49.6, 49.9, T)) }}>
          <span style={{ fontFamily: FONT.mono, color: C.teal }}>$ </span>
          <Typed T={T} t0={49.72} text={`git clone https://${REPO_URL}`} cps={46} color={C.ink} cursor={T < 50.7} />
          {T >= 50.7 ? <div style={{ fontFamily: FONT.mono, color: C.green, marginTop: 10, opacity: clamp((T - 50.7) * 5) }}>✓ apna studio ready</div> : null}
        </div>
      ) : null}
      {/* back on the road: the sign says FORK IT */}
      <Sequence from={Math.round((T_ROAD - t0) * 60)} layout="none">
        <AbsoluteFill>
          <OffthreadVideo src={staticFile('clips/highway_cta.mp4')} muted style={{ width: 1080, height: 1920 }} />
          <Land T={T} at={53.08} from={1.25} style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '24px 46px 30px', borderRadius: 30, background: 'rgba(8,10,12,0.78)', border: `2px solid ${C.gold}88`, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
              <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 48, color: C.ink }}>Comment</div>
              <Gold size={150}>EDITOR</Gold>
              <div style={{ fontFamily: FONT.brand, fontStyle: 'italic', fontSize: 38, color: C.ink2, marginTop: 6 }}>for the repo link</div>
            </div>
          </Land>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
