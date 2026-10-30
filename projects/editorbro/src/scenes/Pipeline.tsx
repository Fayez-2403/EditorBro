// Pipeline (11.7-18.3 s). After the Anmol reel: one thread fans out into many, then code ticks green.
//   11.85 "Claude Code ... chalata hai"  the prompt line runs into a glowing node
//   14.24 "64 skills"                    64 threads fan out to chips carrying the real skill names (config/skills.ts)
//   15.45 "ek pipeline"                  chips dim, one pipeline line draws down from the node
//   16.39 "aur 12 quality gates"         a packet travels down through the 12 gates; each ticks green as it passes
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Land } from '../components/Type';
import { clamp, easeInCubic, easeInOutCubic, easeOutQuint, invLerp } from '../animation/anim';
import { GATES, SKILLS } from '../config/skills';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

const O = { x: 540, y: 610 };
const PACK_COL: Record<string, string> = { ours: C.gold, maxx: '#FF8A5B', hf: '#7FB2FF', ak: '#B69CFF', hyper: C.teal, pack: '#9BE38A' };

// lay the chips out like wrapped text: rows of up to 900 px, centred, 46 px apart
const CW = 10.2, PAD = 26, GAP = 10, ROW = 46, MAXW = 920, TOP = 690;
const CHIPS = (() => {
  const rows: { name: string; pack: string; w: number }[][] = [[]];
  let x = 0;
  for (const s of SKILLS) {
    const w = s.name.length * CW + PAD;
    if (x + w > MAXW && rows[rows.length - 1].length) { rows.push([]); x = 0; }
    rows[rows.length - 1].push({ ...s, w }); x += w + GAP;
  }
  return rows.flatMap((r, ri) => {
    const total = r.reduce((a, c) => a + c.w, 0) + GAP * (r.length - 1);
    let cx = 540 - total / 2;
    return r.map((c) => { const out = { ...c, x: cx + c.w / 2, y: TOP + ri * ROW }; cx += c.w + GAP; return out; });
  });
})();
const GATE_Y0 = 700, GATE_DY = 58;

const Title: React.FC<{ T: number; at: number; out: number; big: string; small: string; color?: string }> = ({ T, at, out, big, small, color = C.gold }) => (
  <Land T={T} at={at} out={out} style={{ position: 'absolute', top: 250, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 26 }}>
    <span style={{ fontFamily: FONT.brand, fontWeight: 900, fontSize: 230, lineHeight: 1, color, textShadow: `0 0 50px ${color}44` }}>{big}</span>
    <span style={{ fontFamily: FONT.display, fontStretch: '80%', fontWeight: 900, fontSize: 84, color: C.ink, textTransform: 'uppercase' }}>{small}</span>
  </Land>
);

export const Pipeline: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  const lineIn = easeOutQuint(invLerp(11.75, 12.35, T));
  const fanOut = (i: number) => easeOutQuint(invLerp(14.05 + i * 0.011, 14.6 + i * 0.011, T));
  const dim = easeInOutCubic(invLerp(15.35, 15.8, T));
  const gone = easeInCubic(invLerp(16.2, 16.55, T));
  const pipe = easeOutQuint(invLerp(15.5, 16.1, T));
  const packet = clamp(invLerp(16.5, 18.05, T));
  const packetY = GATE_Y0 - 40 + packet * (GATE_DY * 11 + 80);
  const nodeGlow = 0.6 + 0.4 * Math.sin(T * 7);
  return (
    <AbsoluteFill style={{ background: C.base, overflow: 'hidden' }}>
      {/* faint grid floor */}
      <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(31,229,200,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(31,229,200,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.8 }} />
      <Land T={T} at={11.8} out={14.0} style={{ position: 'absolute', top: 270, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 800, fontSize: 96, color: C.ink, letterSpacing: -2 }}>Claude Code</div>
        <div style={{ fontFamily: FONT.brand, fontStyle: 'italic', fontSize: 52, color: C.ink2, marginTop: 6 }}>runs the whole studio</div>
      </Land>
      <Title T={T} at={14.2} out={15.32} big="64" small="skills" />
      <Title T={T} at={15.45} out={16.3} big="1" small="pipeline" color={C.teal} />
      <Title T={T} at={16.45} out={18.4} big="12" small="quality gates" color={C.green} />

      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* the prompt line arriving from the left */}
        <line x1={-20} y1={O.y} x2={-20 + (O.x + 20) * lineIn} y2={O.y} stroke={C.teal} strokeWidth={4} opacity={1 - gone} filter="url(#glow)" />
        {/* the fan-out */}
        {CHIPS.map((c, i) => {
          const p = fanOut(i);
          if (p <= 0) return null;
          const len = 900;
          return (
            <path key={c.name} d={`M ${O.x} ${O.y} C ${O.x} ${O.y + 120}, ${c.x} ${c.y - 160}, ${c.x} ${c.y - 14}`} fill="none"
              stroke={PACK_COL[c.pack]} strokeWidth={1.6} strokeDasharray={len} strokeDashoffset={len * (1 - p)} opacity={(0.55 - 0.4 * dim) * (1 - gone)} />
          );
        })}
        {/* the pipeline and its gates */}
        {pipe > 0 ? <line x1={540} y1={O.y} x2={540} y2={O.y + (GATE_DY * 11 + 190) * pipe} stroke={C.teal} strokeWidth={8} filter="url(#glow)" /> : null}
        {T >= 16.45 ? <circle cx={540} cy={packetY} r={16} fill="#E9FFFB" filter="url(#glow)" opacity={packet < 1 ? 1 : 0} /> : null}
        <circle cx={O.x} cy={O.y} r={22 + 6 * nodeGlow} fill={C.teal} opacity={0.25 * lineIn} />
        <circle cx={O.x} cy={O.y} r={13} fill="#E9FFFB" opacity={lineIn} filter="url(#glow)" />
      </svg>

      {/* skill chips */}
      {CHIPS.map((c, i) => {
        const p = fanOut(i);
        const a = clamp((p - 0.6) * 2.5) * (1 - 0.75 * dim) * (1 - gone);
        if (a <= 0) return null;
        return (
          <div key={c.name} style={{ position: 'absolute', left: c.x - c.w / 2, top: c.y - 16, width: c.w, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(12,16,18,0.9)', border: `1.5px solid ${PACK_COL[c.pack]}88`, fontFamily: FONT.mono, fontSize: 17, color: PACK_COL[c.pack], opacity: a,
            transform: `scale(${0.7 + 0.3 * easeOutQuint(clamp((p - 0.6) * 2.5))})` }}>{c.name}</div>
        );
      })}

      {/* the 12 gates */}
      {GATES.map((g, i) => {
        const y = GATE_Y0 + i * GATE_DY;
        const show = easeOutQuint(invLerp(16.42 + i * 0.03, 16.8 + i * 0.03, T));
        if (show <= 0) return null;
        const passed = packetY >= y;
        const tick = easeOutQuint(clamp((packetY - y) / 40));
        return (
          <div key={g} style={{ position: 'absolute', left: 60, width: 960, top: y - 22, height: 44, display: 'flex', alignItems: 'center', opacity: show,
            transform: `translateX(${(1 - show) * (i % 2 ? 60 : -60)}px)` }}>
            <div style={{ width: 420, textAlign: 'right', paddingRight: 34, fontFamily: FONT.mono, fontSize: 30, fontWeight: 700, color: passed ? C.green : C.ink2, letterSpacing: 1 }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 10 }}>{String(i + 1).padStart(2, '0')}</span>{g}
            </div>
            <div style={{ width: 120, height: 6, borderRadius: 3, background: passed ? C.green : 'rgba(255,255,255,0.14)', boxShadow: passed ? `0 0 18px ${C.green}` : undefined }} />
            <div style={{ marginLeft: 30, width: 38, height: 38, borderRadius: 19, border: `2.5px solid ${passed ? C.green : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: passed ? `${C.green}22` : 'transparent', fontFamily: FONT.ui, fontWeight: 900, fontSize: 24, color: C.green }}>
              <span style={{ transform: `scale(${tick})`, display: 'inline-block' }}>✓</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
