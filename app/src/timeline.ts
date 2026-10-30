// The edit: which plate plays when. Every cut is found by the words of the voiceover
// (data/lyrics.json), so re-recording the voiceover and re-running the alignment re-times
// the whole video. Cuts sit in the pause just before each line.
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut 0.18 s before the first word of the line containing `q`. */
  const cut = (q: string, nth = 0) => Math.max(0, ly.get(q, nth).words[0]!.start - 0.18);

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  // Motion Flex, Claude cut (data/flex/score.json -> analysis/build_flex_audio.py -> cues.json): `flex` is
  // the 12-bar reel, `flex_full` puts the 6-bar process intro in front of it. One scene each; every
  // choreography time inside them comes from the measured cues, not from this file.
  if (['flex', 'flex_opp', 'flex_dp', 'flex_bd', 'flex_tr', 'flex_mim', 'flex_gl'].includes((import.meta as any).env?.VITE_VARIANT)) {
    return [E('flex', 'flex', 0, au.duration, { maxSamples: 4 })];
  }
  if (['flex_full', 'flex_opp_full', 'flex_dp_full', 'flex_bd_full', 'flex_tr_full', 'flex_mim_full', 'flex_gl_full'].includes((import.meta as any).env?.VITE_VARIANT)) {
    const join = au.sections.find(s => s.name === 'intro')!.end;
    return [E('flex_intro', 'flex_intro', 0, join, { maxSamples: 4 }), E('flex', 'flex', join, au.duration, { maxSamples: 4 })];
  }

  // DOTS short (projects/dots-heist): one 3D scene, the story is data/dots/cues.json (events from the voice's words, 0.25 s grid).
  // dots_sheet shows the five-mascot character sheet (same data, see vite.config.ts).
  if ((import.meta as any).env?.VITE_VARIANT === 'dots') return [E('dots', 'dots', 0, au.duration, { maxSamples: 2 })];
  if ((import.meta as any).env?.VITE_VARIANT === 'dots_sheet') return [E('dots', 'dots', 0, au.duration, { params: { sheet: true }, maxSamples: 2 })];
  // OPUS 5.5: THE EDITOR'S AURA (projects/editors-aura): one scene runs the 90 s; the story is data/aura/cues.json, every time a
  // measured bar / beat / eighth of General Levy "Dubplate" (analysis/aura_songmap.py, aura_cues.py).
  if ((import.meta as any).env?.VITE_VARIANT === 'aura') return [E('aura', 'aura', 0, au.duration, { maxSamples: 2 })];
  // V2 (projects/editors-aura/V2.md): 89 s re-edit (stock-footage intro, Dubplate climax first then rearranged on its phrases, long outro); data/aura_v2/cues.json `edl`.
  if (['aura_v2', 'aura_v2_51s', 'aura_v3'].includes((import.meta as any).env?.VITE_VARIANT)) return [E('aura_v2', 'aura_v2', 0, au.duration, { maxSamples: 2 })];   // aura_v2_51s: the 51.6 s first cut
  // V4 (projects/editors-aura/V4.md): 28.3 s, the renders only (posted before V2), data/aura_v4/cues.json; real motion blur (--samples 4)
  if ((import.meta as any).env?.VITE_VARIANT === 'aura_v4') return [E('aura_v4', 'aura_v4', 0, au.duration, { maxSamples: 4 })];
  // V4.1 (user, 2026-10-23): V4 with PROMPT -> VIDEO switching on every beat from 0:04 (analysis/aura_v41_cues.py)
  if ((import.meta as any).env?.VITE_VARIANT === 'aura_v41') return [E('aura_v4', 'aura_v4', 0, au.duration, { maxSamples: 4, params: { cues: '/data/aura_v41/cues.json' } })];
  // WHATTT?! 5 Claude project reveals (projects/claude-reveals): one 2D scene; the creators' videos play from frame
  // sequences (analysis/reveals_media.py), the story is data/reveals/cues.json on the 120 BPM grid.
  if ((import.meta as any).env?.VITE_VARIANT === 'reveals') return [E('reveals', 'reveals', 0, au.duration)];
  if ((import.meta as any).env?.VITE_VARIANT === 'reveals_v1') return [E('reveals', 'reveals_v1', 0, au.duration)];   // v1, the 94 s cut
  if ((import.meta as any).env?.VITE_VARIANT === 'reveals_v2') return [E('reveals', 'reveals_v2', 0, au.duration)];   // v2, 76 s (two WHATs)
  // GitHub package firewall reel (projects/github-package-firewall): one 2D scene, the story is data/pkgfw/cues.json on the
  // 122 BPM grid (analysis/pkgfw_cues.py).
  if ((import.meta as any).env?.VITE_VARIANT === 'pkgfw') return [E('pkgfw', 'pkgfw', 0, au.duration)];
  if ((import.meta as any).env?.VITE_VARIANT === 'pkgfw_v1') return [E('pkgfw', 'pkgfw_v1', 0, au.duration)];   // v1, the dark neon cut
  if ((import.meta as any).env?.VITE_VARIANT === 'pkgfw_v2') return [E('pkgfw', 'pkgfw_v2', 0, au.duration)];   // v2, light, no caution hook
  // Claude Duet reel (projects/claude-duet): one 2D scene, the story is data/duet/cues.json (the voice's words on the 124 BPM grid,
  // analysis/duet_cues.py). duet_cover / duet_cover_clean draw the separate cover still (with and without its text).
  if ((import.meta as any).env?.VITE_VARIANT === 'duet') return [E('duet', 'duet', 0, au.duration, { maxSamples: 2 })];
  if ((import.meta as any).env?.VITE_VARIANT === 'duet_cover') return [E('duet', 'duet', 0, au.duration, { params: { cover: 'text' } })];
  if ((import.meta as any).env?.VITE_VARIANT === 'duet_cover_clean') return [E('duet', 'duet', 0, au.duration, { params: { cover: 'clean' } })];
  // Carbon-X reel (projects/carbon-x): one 2D scene, the story is data/carbonx/cues.json (the voice's words on the 112 BPM grid,
  // analysis/carbonx_cues.py). carbonx_cover / carbonx_cover_clean draw the separate cover still (with and without its text).
  if ((import.meta as any).env?.VITE_VARIANT === 'carbonx') return [E('carbonx', 'carbonx', 0, au.duration, { maxSamples: 2 })];
  if ((import.meta as any).env?.VITE_VARIANT === 'carbonx_cover') return [E('carbonx', 'carbonx', 0, au.duration, { params: { cover: 'text' } })];
  if ((import.meta as any).env?.VITE_VARIANT === 'carbonx_cover_clean') return [E('carbonx', 'carbonx', 0, au.duration, { params: { cover: 'clean' } })];
  // Grok Bot reel (projects/grok-bot-reel): one 3D scene, the story is data/grokbot/cues.json on the 120 BPM grid.
  // grokbot_sheet shows the six-bot character sheet (same data, see vite.config.ts).
  if ((import.meta as any).env?.VITE_VARIANT === 'grokbot') return [E('grokbot', 'grokbot', 0, au.duration, { maxSamples: 2 })];
  if ((import.meta as any).env?.VITE_VARIANT === 'grokbot_sheet') return [E('grokbot', 'grokbot', 0, au.duration, { params: { sheet: true }, maxSamples: 2 })];

  // Music-led exception to the spoken-word edit: one continuous carrier, measured beat grid.
  if ((import.meta as any).env?.VITE_VARIANT === 'motion') {
    return [E('motion', 'motion_flex', 0, au.duration, { maxSamples: 12 })];
  }
  if ((import.meta as any).env?.VITE_VARIANT === 'possibilities') {
    return [E('possibilities', 'possibilities', 0, au.duration, { maxSamples: 4 })];
  }
  if ((import.meta as any).env?.VITE_VARIANT === 'motion_full') {
    const join = au.sections.find(s => s.name === 'original_motion')!.end;
    return [E('motion', 'motion_flex', 0, join, { params: { scoreDuration: 15 }, maxSamples: 4 }),
      E('possibilities', 'possibilities', join, au.duration, { maxSamples: 4 })];
  }

  // VITE_VARIANT=gh1|gh2|gh3: the "GitHub Trending" series (3 parts, each under a minute), night-trek template with the
  // gh theme, full-screen windows. One shot per spoken line of analysis/script_<variant>.py. Real 3x captures in
  // app/public/gh (boxes.json has the page boxes; the tour stops below are page CSS px, picked from those).
  // Stars are live GitHub counts from 2026-10-12; claims from each repo's description / README.
  const series: Record<string, [string, Record<string, any>][]> = {
    gh1: [
      ['trek_series', { part: 'PART 1/4', kicker: '10 REPOS BLOWING UP ON GITHUB', title: 'FREE AI TOOLS', title2: 'FOR CREATORS', cards: [
        { img: 'gh/voicestudio.jpg', url: 'github.com/debpalash/VoiceStudio', stars: 60 },
        { img: 'gh/ppt-master.jpg', url: 'github.com/hugohe3/ppt-master', stars: 61 },
        { img: 'gh/diagram-design.jpg', url: 'github.com/cathrynlavery/diagram-design', stars: 52 }] }],
      ['trek_repo', { img: 'gh/voicestudio.jpg', boxes: 'voicestudio', url: 'github.com/debpalash/VoiceStudio', index: 1, owner: 'debpalash',
        name: 'VOICESTUDIO', stars: 60, claim: '646 LANGUAGES', notes: ['VOICE CLONING · DUBBING · TRANSCRIPTION', 'FULLY LOCAL · OPEN-SOURCE ELEVENLABS ALTERNATIVE'],
        focusBoxes: [[65, 2273, 838, 51], [65, 2410, 838, 48]], readBox: [65, 3144, 838, 380], readLabel: 'THE APP', nameWord: 'VoiceStudio' }],
      ['trek_repo', { img: 'gh/ppt-master.jpg', boxes: 'ppt-master', url: 'github.com/hugohe3/ppt-master', index: 2, owner: 'hugohe3',
        name: 'PPT-MASTER', stars: 61, claim: 'DOCS → REAL POWERPOINT', notes: ['PDF OR WORD IN · EDITABLE .PPTX OUT', 'NATIVE SHAPES · TRANSITIONS · ANIMATIONS'],
        focusBoxes: [[65, 1171, 838, 91]], readBox: [65, 2840, 838, 250], readLabel: 'EXAMPLES', nameWord: 'ppt-master' }],
      ['trek_repo', { img: 'gh/diagram-design.jpg', boxes: 'diagram-design', url: 'github.com/cathrynlavery/diagram-design', index: 3, owner: 'cathrynlavery',
        name: 'DIAGRAM-DESIGN', stars: 52, claim: '44 DIAGRAM TYPES', notes: ['ASK IN WORDS · GET A DIAGRAM', 'IN YOUR BRAND · CLAUDE CODE · CURSOR · CODEX'],
        focusBoxes: [[65, 1318, 838, 419]], readBox: [65, 2138, 838, 471], readLabel: 'DEMO', nameWord: 'diagram-design' }],
      ['trek_outro', { kicker: 'SAVE THESE 3', pick: 'CREATOR TOOLS', cta: 'FOLLOW TECHPE TREK', sub: 'PART 2 → WILD AI APPS', noLogo: true, rows: [
        { name: 'VoiceStudio', stars: 60 }, { name: 'ppt-master', stars: 61 }, { name: 'diagram-design', stars: 52 }] }],
    ],
    gh2: [
      ['trek_series', { part: 'PART 2/4', kicker: '10 REPOS BLOWING UP ON GITHUB', title: 'WILD AI APPS', title2: 'TO TRY TODAY', cards: [
        { img: 'gh/gods-eye-view.jpg', url: 'github.com/bilawalsidhu/gods-eye-view', stars: 53 },
        { img: 'gh/rea.jpg', url: 'github.com/morluto/rea', stars: 137 },
        { img: 'gh/paperclip.jpg', url: 'github.com/paperclipai/paperclip', stars: 101 }] }],
      ['trek_repo', { img: 'gh/gods-eye-view.jpg', boxes: 'gods-eye-view', url: 'github.com/bilawalsidhu/gods-eye-view', index: 1, owner: 'bilawalsidhu',
        name: 'GODS-EYE-VIEW', stars: 53, claim: 'REAL DATA. 3D GLOBE.', notes: ['LIVE PLANES · SHIPS · SATELLITES', '#1 ON GITHUB TRENDING · NO API KEYS TO START'],
        focusBoxes: [[65, 1763, 838, 50], [65, 1829, 838, 48]], readBox: [84, 1933, 800, 450], readLabel: 'LIVE GLOBE', nameWord: 'gods-eye-view' }],
      ['trek_repo', { img: 'gh/rea.jpg', boxes: 'rea', url: 'github.com/morluto/rea', index: 2, owner: 'morluto',
        name: 'REA', stars: 137, claim: 'REVERSE ENGINEER ANYTHING', notes: ['ONE MCP FOR YOUR AI AGENT', 'APP BEHAVIOR → NATIVE BINARIES'],
        focusBoxes: [[65, 2883, 838, 51], [65, 2958, 838, 25]], readBox: [65, 3302, 838, 477], readLabel: 'IN ACTION', nameWord: 'REA' }],
      ['trek_repo', { img: 'gh/paperclip.jpg', boxes: 'paperclip', url: 'github.com/paperclipai/paperclip', index: 3, owner: 'paperclipai',
        name: 'PAPERCLIP', stars: 101, claim: 'YOUR AI AGENT TEAM', notes: ['MANAGE AGENTS LIKE YOUR STAFF', 'OPEN SOURCE · THE APP TO RUN AGENTS AT WORK'],
        focusBoxes: [[124, 2401, 720, 518]], readBox: [65, 3802, 838, 91], readLabel: 'README', nameWord: 'paperclip' }],
      ['trek_outro', { kicker: 'SAVE THESE 3', pick: 'WILD AI APPS', cta: 'FOLLOW TECHPE TREK', sub: 'PART 3 → CLAUDE CODE SKILL PACKS', noLogo: true, rows: [
        { name: 'gods-eye-view', stars: 53 }, { name: 'rea', stars: 137 }, { name: 'paperclip', stars: 101 }] }],
    ],
    gh3: [
      ['trek_series', { part: 'PART 3/4', kicker: '10 REPOS BLOWING UP ON GITHUB', title: 'CLAUDE CODE', title2: 'SKILL PACKS', cards: [
        { img: 'gh/mattpocock-skills.jpg', url: 'github.com/mattpocock/skills', stars: 287 },
        { img: 'gh/ecc.jpg', url: 'github.com/affaan-m/ECC', stars: 278 }] }],
      ['trek_repo', { img: 'gh/mattpocock-skills.jpg', boxes: 'mattpocock-skills', url: 'github.com/mattpocock/skills', index: 1, owner: 'mattpocock',
        name: 'SKILLS', stars: 287, claim: 'SKILLS FOR REAL ENGINEERS', notes: ['USED EVERY DAY · NOT VIBE CODING', 'SMALL · EASY TO ADAPT · COMPOSABLE'],
        focusBoxes: [[65, 1354, 838, 51], [65, 1463, 838, 24]], readBox: [65, 1567, 838, 48], readLabel: 'README', nameWord: 'Pocock' }],
      ['trek_repo', { img: 'gh/ecc.jpg', boxes: 'ecc', url: 'github.com/affaan-m/ECC', index: 2, owner: 'affaan-m',
        name: 'ECC', stars: 278, claim: 'SKILLS + MEMORY + SECURITY', notes: ['ONE PACK FOR EVERY AI HARNESS', 'CLAUDE CODE · CODEX · OPENCODE · CURSOR'],
        focusBoxes: [[33, 417, 361, 41], [33, 540, 361, 41], [33, 581, 361, 41], [33, 622, 361, 41]], readBox: [976, 229, 272, 120], readLabel: 'ABOUT', nameWord: 'ECC' }],
      ['trek_outro', { kicker: 'SAVE THESE 2', pick: 'CLAUDE CODE SKILL PACKS', cta: 'FOLLOW TECHPE TREK', sub: 'PART 4 → RULES + MEMORY', noLogo: true, rows: [
        { name: 'mattpocock/skills', stars: 287 }, { name: 'ECC', stars: 278 }] }],
    ],
    gh4: [
      ['trek_series', { part: 'PART 4/4', kicker: '10 REPOS BLOWING UP ON GITHUB', title: 'CLAUDE CODE', title2: 'RULES + MEMORY', cards: [
        { img: 'gh/karpathy-skills.jpg', url: 'github.com/multica-ai/andrej-karpathy-skills', stars: 219 },
        { img: 'gh/claude-mem.jpg', url: 'github.com/thedotmack/claude-mem', stars: 100 }] }],
      ['trek_repo', { img: 'gh/karpathy-skills.jpg', boxes: 'karpathy-skills', url: 'github.com/multica-ai/andrej-karpathy-skills', index: 1, owner: 'multica-ai',
        name: 'KARPATHY-SKILLS', stars: 219, claim: 'ONE FILE. FOUR RULES.', notes: ['FROM KARPATHY ON LLM CODING PITFALLS', 'THINK · SIMPLIFY · SURGICAL · GOAL-DRIVEN'],
        focusBoxes: [[65, 891, 838, 48]], readBox: [65, 1625, 838, 340], readLabel: 'THE 4 RULES', nameWord: 'Karpathy' }],
      ['trek_repo', { img: 'gh/claude-mem.jpg', boxes: 'claude-mem', url: 'github.com/thedotmack/claude-mem', index: 2, owner: 'thedotmack',
        name: 'CLAUDE-MEM', stars: 100, claim: 'MEMORY ACROSS SESSIONS', notes: ['CAPTURES · COMPRESSES · INJECTS CONTEXT', 'CLAUDE CODE · CODEX · GEMINI · COPILOT'],
        focusBoxes: [[976, 229, 272, 192]], readBox: [79, 3248, 392, 220], readLabel: 'PREVIEW', nameWord: 'claude-mem' }],
      ['trek_outro', { kicker: 'SAVE ALL 4 PARTS', pick: 'RULES + MEMORY', cta: 'FOLLOW TECHPE TREK', sub: 'SAVE · SHARE · FOLLOW FOR MORE', noLogo: true, rows: [
        { name: 'karpathy-skills', stars: 219 }, { name: 'claude-mem', stars: 100 }] }],
    ],
  };
  const vv = (import.meta as any).env?.VITE_VARIANT as string;
  if (series[vv]) {
    const shots = series[vv]!;
    const at = (i: number) => (i === 0 ? 0 : Math.max(0, ly.lines[i]!.words[0]!.start - 0.18));
    return shots.map(([file, params], i) => E(`${vv}_${i}`, file, at(i), i + 1 < shots.length ? at(i + 1) : au.duration,
      { params: { line: i, theme: 'gh', full: true, noWatermark: true, of: shots.length - 2, boxesFile: 'gh/boxes.json', ...params } }));
  }

  // VITE_VARIANT=repos: five GitHub repos of AI agents and skills, night-trek template (9:16). One shot per spoken
  // line of analysis/script_repos.py. Real GitHub captures in app/public/repos (boxes.json: page boxes the camera
  // visits); stars are live GitHub counts from 2026-10-11, claims from each README.
  if ((import.meta as any).env?.VITE_VARIANT === 'repos') {
    const shots: [string, Record<string, any>][] = [
      ['trek_hook', { img: 'repos/poster.jpg', big: '400+', title: 'READY-MADE AI AGENTS & SKILLS', pill: '5 REPOS · 100% FREE · SAVE THIS',
        stops: [[660, 420], [2140, 420], [660, 1255], [660, 2460], [2140, 2310]] }],
      ['trek_repo', { img: 'repos/agency-agents.jpg', boxes: 'agency-agents', url: 'github.com/msitarzewski/agency-agents', index: 1,
        owner: 'msitarzewski', name: 'AGENCY-AGENTS', stars: 159, claim: '230+ AGENTS', notes: ['ENGINEERING · DESIGN · MARKETING · SALES', 'EVERY AGENT HAS A PERSONALITY & A PROCESS'],
        focus: ['engineering', 'design', 'marketing', 'sales'], nameWord: 'agency-agents' }],
      ['trek_repo', { img: 'repos/wshobson-agents.jpg', boxes: 'wshobson-agents', url: 'github.com/wshobson/agents', index: 2,
        owner: 'wshobson', name: 'AGENTS', stars: 40, claim: '94 PLUGINS', notes: ['202 AGENTS · 184 SKILLS · 105 COMMANDS', 'CLAUDE CODE · CODEX · CURSOR · COPILOT'],
        focus: ['202 agents, 184 skills, and 105 commands'], nameWord: 'agents' }],
      ['trek_repo', { img: 'repos/knowledge-work-plugins.jpg', boxes: 'knowledge-work-plugins', url: 'github.com/anthropics/knowledge-work-plugins', index: 3,
        owner: 'anthropics', name: 'KNOWLEDGE-WORK-PLUGINS', stars: 29, claim: 'A PLUGIN PER JOB', notes: ['BY ANTHROPIC · SALES · LEGAL · FINANCE · DATA', 'SKILLS + CONNECTORS + SLASH COMMANDS'],
        focus: ['sales', 'customer-support', 'legal', 'finance', 'data'], nameWord: 'knowledge-work' }],
      ['trek_repo', { img: 'repos/claude-quickstarts.jpg', boxes: 'claude-quickstarts', url: 'github.com/anthropics/claude-quickstarts', index: 4,
        owner: 'anthropics', name: 'CLAUDE-QUICKSTARTS', stars: 18, claim: 'DEPLOY TODAY', notes: ['OFFICIAL ANTHROPIC PROJECTS', 'SUPPORT AGENT · DATA ANALYST · COMPUTER USE'],
        focus: ['computer-use-demo', 'customer-support-agent', 'financial-data-analyst'], nameWord: 'claude-quickstarts' }],
      ['trek_repo', { img: 'repos/agent-skills.jpg', boxes: 'agent-skills', url: 'github.com/addyosmani/agent-skills', index: 5,
        owner: 'addyosmani', name: 'AGENT-SKILLS', stars: 105, claim: '25 SKILLS', notes: ['SPEC → PLAN → BUILD → TEST → SHIP', 'PRODUCTION-GRADE · FOR ANY AI CODING AGENT'],
        focus: ['Production-grade engineering skills'], nameWord: 'agent-skills' }],
      ['trek_outro', { kicker: 'START WITH', pick: 'claude-quickstarts', cta: 'FOLLOW TECHPE TREK', sub: 'SAVE THIS · SHARE WITH YOUR TEAM', noLogo: true, rows: [
        { name: 'agency-agents', stars: 159 }, { name: 'agents', stars: 40 }, { name: 'knowledge-work-plugins', stars: 29 },
        { name: 'claude-quickstarts', stars: 18 }, { name: 'agent-skills', stars: 105 }] }],
    ];
    const at = (i: number) => (i === 0 ? 0 : Math.max(0, ly.lines[i]!.words[0]!.start - 0.18));
    // no bottom-right watermark (user's choice, 2026-10-12): the windows grow into its space; the outro keeps the lockup
    return shots.map(([file, params], i) =>
      E(`r${i}`, file, at(i), i + 1 < shots.length ? at(i + 1) : au.duration, { params: { line: i, noWatermark: true, ...params } }));
  }

  // VITE_VARIANT=decision: the Microsoft-Decision-1 explainer on the Vox template (9:16). One shot per spoken
  // line of analysis/script_decision.py: shot i plays from just before line i to just before line i + 1.
  // Facts: Microsoft Command Line, 2026.10.09, and its chart "Accuracy, latency and calibration, side by side".
  if ((import.meta as any).env?.VITE_VARIANT === 'decision') {
    const shots: [string, Record<string, any>][] = [
      ['vox_kinetic', { lines: ['WHY WOULD', 'MICROSOFT BUILD', 'AN AI THAT', 'DOESN’T WRITE?'], hi: [3], open: true }],
      ['vox_kinetic', { chip: '2026.10.09', lines: ['MEET', 'MICROSOFT-', 'DECISION-1'], hi: [2], sub: 'A MODEL FOR FAST DECISION-MAKING' }],
      ['vox_cards', { title: 'WRITE OR DECIDE', cards: [
        { head: 'LLM', body: 'WRITES TEXT', lines: 3 },
        { head: 'DECISION-1', body: 'A PROBABILITY PER OPTION', hi: true }] }],
      ['vox_cards', { title: 'YOU GIVE IT OPTIONS', cards: [{ head: 'YES / NO' }, { head: 'MULTIPLE CHOICE' }, { head: 'RATING' }],
        foot: 'A CALIBRATED PROBABILITY FOR EACH' }],
      ['vox_counter', { value: 90, suffix: '%', kicker: 'CALIBRATED PROBABILITY', subs: ['SHOULD BE RIGHT', 'ABOUT 9 TIMES IN 10'], land: 'probability' }],
      ['vox_bars', { title: 'AVERAGE ACCURACY', sub: '36 BENCHMARKS · 147,137 QUESTIONS', max: 100, rows: [
        { name: 'Microsoft-Decision-1', value: 83.5, label: '83.5%', hi: true },
        { name: 'Jev 1.13.0', value: 82.3, label: '82.3%' },
        { name: 'Quyet-1.0-Large', value: 81.9, label: '81.9%' },
        { name: 'Surogate Rune 26B-A4B', value: 79.7, label: '79.7%' },
        { name: 'GPT-6 Luna Decisions', value: 79.4, label: '79.4%' }], stamp: 'FIRST', stampWord: '83.5%' }],
      ['vox_bars', { title: 'MEDIAN LATENCY', sub: 'LOWER IS BETTER · PER REQUEST', max: 3010, rows: [
        { name: 'Microsoft-Decision-1', value: 85, label: 'p50 85 ms', hi: true },
        { name: 'H2O-Lightning-4B v1.1', value: 210, label: '210 ms' },
        { name: 'Jev 1.13.0', value: 240, label: '240 ms' },
        { name: 'GPT-6 Sol', value: 3010, label: '3.01 s', ref: true }],
        stamp: '35× FASTER', stampWord: '35', note: '2.5× QUICKER THAN H2O-LIGHTNING-4B V1.1', noteWord: '2.5' }],
      ['vox_shuffle', { title: 'SHUFFLE THE OPTIONS', options: ['OPTION A', 'OPTION B', 'OPTION C', 'OPTION D'], picked: 1,
        stamp: '0 FLIPS', stampWord: 10, note: '1.3% AVERAGE FLIP RATE · 8 PERTURBATIONS', noteWord: '1.3%' }],
      ['vox_cards', { title: 'XBOX RESEARCH', cards: [
        { head: '10,000+', body: 'PIECES OF FEEDBACK SORTED' },
        { head: 'OVER 14×', body: 'FASTER THAN GPT-6 SOL' },
        { head: '200×', body: 'LESS EXPENSIVE', hi: true }], foot: 'QUALITY COMPETITIVE WITH GPT-6 SOL' }],
      ['vox_counter', { prefix: '$', value: 0.042, decimals: 3, kicker: 'PRICE', subs: ['PER MILLION INPUT TOKENS', 'OUTPUT TOKENS: FREE'], land: '$0.042' }],
      ['vox_cards', { title: 'AVAILABLE NOW', cards: [{ head: 'MICROSOFT FOUNDRY' }, { head: 'OPENROUTER' }], foot: 'DOCS ON MICROSOFT LEARN' }],
      ['vox_kinetic', { lines: ['FAST DECISIONS,', 'NOT LONG', 'ANSWERS.'], hi: [0] }],
    ];
    const at = (i: number) => (i === 0 ? 0 : Math.max(0, ly.lines[i]!.words[0]!.start - 0.18));
    return shots.map(([file, params], i) =>
      E(`s${String(i + 1).padStart(2, '0')}`, file, at(i), i + 1 < shots.length ? at(i + 1) : au.duration, { params: { line: i, ...params } }));
  }

  // VITE_VARIANT=reel: the 9:16 Hindi reel (vertical plates, data/reel/*). Cuts are found by the Latin
  // word that only the first line of each plate has.
  if ((import.meta as any).env?.VITE_VARIANT === 'reel') {
    const r = {
      answers: cut('answers'),
      code: cut('support ticket'),
      policy: cut('judgment'),
      tradeoffs: cut('Classify'),
      verdict: cut('LLM'),
      end: au.duration,
    };
    return [
      E('hook', 'reel_hook', 0, r.answers),
      E('answers', 'reel_answers', r.answers, r.code),
      E('code', 'reel_code', r.code, r.policy),
      E('policy', 'reel_policy', r.policy, r.tradeoffs),
      E('tradeoffs', 'reel_tradeoffs', r.tradeoffs, r.verdict),
      E('verdict', 'reel_verdict', r.verdict, r.end),
    ];
  }

  const b = {
    answers: cut('Sirf teen answers'),
    code: cut('Ek support ticket'),
    policy: cut('Jev sirf judgment'),
    tradeoffs: cut('Classify aur route'),
    verdict: cut('LLM likhta hai'),
    end: au.duration,
  };

  return [
    E('hook', 'hook', 0, b.answers),
    E('answers', 'answers', b.answers, b.code),
    E('code', 'code', b.code, b.policy),
    E('policy', 'policy', b.policy, b.tradeoffs),
    E('tradeoffs', 'tradeoffs', b.tradeoffs, b.verdict),
    E('verdict', 'verdict', b.verdict, b.end),
  ];
}
