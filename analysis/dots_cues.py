"""DOTS short: storyboard as data -> data/dots/cues.json. Story events are derived from the words they illustrate
(data/dots/lyrics.json) and snapped to the 120 BPM 0.25 s grid, so a re-recorded voice re-times the whole short; the
rest sit on beats of the score (data/dots/music.json). `sfx` is the foley cue sheet read by analysis/dots_mix.py.

    python analysis/dots_cues.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "dots"
LY = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
snap = lambda t: round(round(t / 0.25) * 0.25, 2)
norm = lambda s: re.sub(r"[^\w-]", "", s.lower())


def w(line, word, nth=0):
    """Start of `word` in lyrics line `line` (index), snapped to the grid."""
    hits = [x for x in LY[line]["words"] if norm(x["w"]) == norm(word)]
    return snap(hits[nth]["start"])


def words_of(i): return [[x["start"], x["end"]] for x in LY[i]["words"]]


E = {
    # 0 COLD OPEN (hook): the heist crew in a spotlight, then the target locks on the list
    "h.raat": w(0, "aaj"), "h.heist": w(0, "heist"), "h.cut": w(0, "Aur"), "h.target": w(0, "target?"), "h.lock": w(0, "to-do"),
    # 1 MONSTER AWAKENS (it wakes when targeted, roars just after "list!")
    "m.roar": snap(LY[0]["end"] + 0.05),
    "m.count": [w(1, "emails,"), w(1, "meetings,"), w(1, "deadline...")], "m.kal": w(1, "kal"),
    "m.pink": 8.25, "m.scream": w(2, "Bachao!"), "m.lunge": 9.25, "m.chomp": 9.75,
    # 2 MEET THE LEGENDS
    "l.cut": 10.0, "l.drops": [10.75, 11.0, 11.25, 11.5, 11.75], "l.title": w(3, "Dots"), "l.one": w(4, "Dot"),
    "l.roll": [w(5, "Content!"), w(6, "Research!"), w(7, "Code."), w(8, "Explore!"), w(9, "Apps!")],
    # 3 SECRET WORKSHOP
    "w.cut": 20.0, "w.inside": w(10, "workshop"), "w.openai": w(10, "OpenAI"), "w.cloud": w(10, "cloud"),
    "w.browser": w(11, "browser,"), "w.screen": w(11, "screen,"), "w.nonstop": w(11, "non-stop!"), "w.shh": 28.0, "w.plan": w(12, "plan"),
    # 4 BUG HUNT
    "b.cut": 30.0, "b.title": w(13, "bug"), "b.scan": 32.0, "b.found": w(14, "Bug"), "b.chase": w(15, "Aaah!"),
    "b.squash": w(16, "Bugs"), "b.fix": w(16, "fix"), "b.review": w(16, "review"),
    # 5 CONTENT CREATOR MELTDOWN
    "c.cut": 40.0, "c.melt": w(17, "meltdown!"), "c.post": w(17, "Post"), "c.zero": w(17, "zero!"), "c.pink": 43.5,
    "c.cards": [w(19, "Hooks,"), w(19, "captions,"), w(19, "thumbnail"), w(19, "plan,")], "c.done": w(19, "minutes"),
    # 6 LAUNCH DISASTER (silence 53-54, drop 54)
    "x.cut": 50.0, "x.launch": w(20, "launch"), "x.crash": w(20, "crash!"), "x.freeze": 53.0, "x.drop": 54.0,
    "x.status": [w(22, "status"), w(22, "fix"), w(22, "team")], "x.liftoff": 59.0,
    # 7 CONNECTED WORLD
    "k.cut": 60.0, "k.apps": [w(23, "ChatGPT,"), w(23, "Slack"), w(23, "Teams")], "k.many": w(24, "Hazaaron"),
    "k.msg": w(24, "message,"), "k.go": w(24, "shuru!"), "k.boss": w(25, "boss!"),
    # 8 WHILE YOU WERE SLEEPING
    "s.cut": 70.0, "s.green": w(27, "Research"), "s.read": w(28, "research"), "s.lock": w(28, "read-only."),
    "s.nosend": w(28, "bhejta,"), "s.noedit": w(28, "badalta."), "s.morning": 79.25,
    # 9 WHO'S THE BOSS
    "o.cut": 80.0, "o.aap": w(29, "Aap!"), "o.sneak": 82.5, "o.ask": w(30, "Send"), "o.yank": 84.25,
    "o.card": w(31, "poochhta"), "o.rules": w(31, "approval"), "o.approve": 88.0,
    # 10 GIFT OF TIME + CTA
    "g.cut": 90.0, "g.fold": w(32, "khatam."), "g.open": w(32, "Time..."), "g.hero": 92.75, "g.cta": w(33, "Comment"),
    "g.brand": w(33, "Tech"), "g.end": 94.0,
}
speak = {str(l["i"]): words_of(l["i"]) for l in LY}

S = []   # (time, kind, gain)
add = lambda t, k, g=1.0: S.append([round(t, 3), k, g])
add(0.6, "pop", 0.45); add(E["h.heist"], "glint", 0.6); add(1.25, "boing", 0.5)   # spotlight clunk, Blue's shh, Purple's glint, Pink's hop
add(E["h.cut"], "whoosh", 0.7); add(E["h.cut"], "paper", 0.6); add(E["h.target"], "scan", 0.5); add(E["h.lock"], "lock", 0.8)
add(E["m.roar"], "roar", 0.85)
for t in E["m.count"]: add(t, "ding", 0.5)
add(E["m.kal"], "stamp", 0.8); add(E["m.pink"], "boing", 0.6); add(E["m.lunge"], "whoosh", 0.8); add(E["m.chomp"], "chomp", 1.0)
for t in E["l.drops"]: add(t, "thud", 0.8)
add(E["l.title"], "sparkle", 0.6); add(E["l.one"], "shimmer", 0.6)
for k, t in enumerate(E["l.roll"]): add(t - 0.1, ["boing", "zip", "tick", "boing", "glint"][k], 0.55)
add(E["w.cut"], "whoosh", 0.6); add(E["w.inside"], "door", 0.7); add(E["w.cloud"], "boot", 0.6); add(E["w.browser"], "pop", 0.5)
add(E["w.screen"], "pop", 0.5); add(E["w.nonstop"], "type", 0.5); add(E["w.shh"], "tiptoe", 0.6); add(E["w.plan"], "paper", 0.6)
add(E["b.cut"], "whoosh", 0.6); add(E["b.title"], "sparkle", 0.4); add(E["b.scan"], "scan", 0.5); add(E["b.found"], "pop", 0.7)
add(E["b.chase"], "scuttle", 0.8); add(E["b.squash"], "splat", 1.0); add(E["b.fix"], "ding", 0.6); add(E["b.review"], "card", 0.6)
add(E["c.cut"], "whoosh", 0.5); add(E["c.melt"], "melt", 0.9); add(E["c.zero"], "buzzer", 0.6); add(E["c.pink"], "scratch", 0.7)
for t in E["c.cards"]: add(t, "card", 0.6)
add(E["c.done"], "ding", 0.6)
add(E["x.cut"], "whoosh", 0.5); add(E["x.launch"], "beep", 0.6); add(E["x.crash"], "crash", 1.0); add(E["x.crash"] + 0.5, "alarm", 0.6)
add(E["x.drop"] + 0.25, "slide", 0.7)
for t in E["x.status"]: add(t, "tick", 0.6)
add(E["x.liftoff"], "rocket", 0.9)
add(E["k.cut"], "whoosh", 0.5)
for t in E["k.apps"]: add(t, "dock", 0.7)
add(E["k.many"], "swarm", 0.6); add(E["k.msg"], "pop", 0.6); add(E["k.go"], "ding", 0.5); add(E["k.boss"], "glint", 0.6)
add(E["s.cut"], "whoosh", 0.3); add(E["s.green"], "tiptoe", 0.5); add(E["s.read"], "page", 0.5); add(E["s.lock"], "lock", 0.7)
add(E["s.nosend"], "nope", 0.5); add(E["s.noedit"], "nope", 0.5); add(E["s.morning"], "chirp", 0.5)
add(E["o.cut"], "hum", 0.5); add(E["o.aap"], "sparkle", 0.7); add(E["o.sneak"], "tiptoe", 0.6); add(E["o.yank"], "zip", 0.8)
add(E["o.yank"] + 0.35, "thud", 0.6); add(E["o.card"], "pop", 0.6); add(E["o.approve"], "approve", 0.9); add(E["o.approve"] + 0.1, "confetti", 0.7)
add(E["g.cut"], "whoosh", 0.4); add(E["g.fold"], "fold", 0.7); add(E["g.open"], "pop", 0.8); add(E["g.open"] + 0.25, "tick", 0.5)
add(E["g.hero"], "thud", 0.6); add(E["g.cta"], "pop", 0.6); add(E["g.end"], "confetti", 0.8)
S.sort()
out = {"notes": "DOTS short storyboard as data: events from the voice's word times snapped to the 0.25 s grid (analysis/dots_cues.py). "
                "app/src/scenes/dots.ts reads `events` + `speak`; analysis/dots_mix.py reads `sfx`. Scene cuts are hard cuts on bar lines.",
       "scenes": [[0, 10, "monster"], [10, 20, "legends"], [20, 30, "workshop"], [30, 40, "bughunt"], [40, 50, "meltdown"],
                  [50, 60, "launch"], [60, 70, "connected"], [70, 80, "sleeping"], [80, 90, "boss"], [90, 96, "gift"]],
       "events": E, "speak": speak, "sfx": S}
(D / "cues.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(f"wrote {D / 'cues.json'}: {len(E)} events, {len(S)} foley cues")
