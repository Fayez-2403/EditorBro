"""The GitHub package firewall reel's storyboard as data -> data/pkgfw/cues.json.

Every story event is taken from the voice (data/pkgfw/lyrics.json, the voice's own word timestamps) and snapped to the
score's grid (data/pkgfw/music.json): beats, snares (beats 2 and 4) or downbeats. The foley list puts a synthesized sound on
each event (analysis/pkgfw_mix.py makes them). Run after pkgfw_vo.py and pkgfw_music.py.

    python analysis/pkgfw_cues.py
"""
import json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_pkgfw_v1 import CHAPTERS, BEAT, bar, SLAM, REWIND, DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "pkgfw"


def main():
    music = json.loads((D / "music.json").read_text())
    L = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    beats, snares = music["beats"], music["snares"]

    def word(i, w, nth=0):
        hits = [x for x in L[i]["words"] if re.sub(r"[,.!?;:…]+$", "", x["w"]).lower() == w.lower()]
        return hits[nth]["start"]
    near = lambda t, grid: min(grid, key=lambda g: abs(g - t))
    B = lambda t: round(near(t, beats), 4)          # the beat nearest a word
    S = lambda t: round(near(t, snares), 4)          # the snare nearest a word
    r = lambda x: round(x, 4)

    ev = {
        # hook: the slam on the first downbeat (inside "install"), the rewind on beat 4, the cut on bar 1
        "hook.slam": r(SLAM), "hook.bad": r(SLAM), "hook.rewind": r(REWIND), "hook.cut": r(bar(1)),
        # terminal: back before the install; Enter on beat 2, the red cubes on "dependency", the build alarm on "build"
        "term.enter": r(bar(1) + BEAT), "term.cubes": B(word(3, "dependency")), "term.warn": r(bar(2)),
        "term.build": B(word(3, "build")),
        # firewall: the schematic on the cut, GitHub's name on "GitHub", the shield on the downbeat before "firewall"
        "fw.github": B(word(4, "GitHub")), "fw.shield": r(bar(6)), "fw.label": r(bar(6) + BEAT), "fw.scan": r(bar(7)),
        # policy: the admin header on "Admins", each card on the snare nearest its words, the held / passed packages
        "pol.admin": B(word(5, "Admins")), "pol.card1": S(word(5, "cooldown")), "pol.card2": S(word(5, "advisory")),
        "pol.card3": S(word(5, "supply-chain")), "pol.arrive": r(bar(11)), "pol.scan": B(word(5, "Policy")),
        "pol.held": S(word(5, "fail")), "pol.pass": r(bar(12) + BEAT),
        # limits: the stop on the bar line, a panel on each limit as it is said
        "lim.stop": r(bar(13)), "lim.p1": B(word(6, "automatic")), "lim.p2": B(word(6, "preview")), "lim.p3": B(word(6, "npm")),
        # CTA: the question, the toggle on "enable", the comment pill on "Comment", the brand on the last downbeat
        "cta.q": B(word(7, "Tum")), "cta.toggle": B(word(7, "enable")), "cta.comment": B(word(7, "Comment")), "cta.brand": r(bar(18)),
    }
    e = ev
    sfx = [
        [0.0, "fall", 0.9], [e["hook.slam"], "slam", 1.0], [e["hook.slam"] + 0.08, "glitch", 0.7], [e["hook.slam"] + BEAT, "alert", 0.55],
        [e["hook.slam"] + 2 * BEAT, "glitch", 0.5], [e["hook.cut"], "whoosh", 0.7],
        [e["term.enter"], "enter", 0.9], [e["term.enter"] + BEAT / 2, "tick", 0.4], [e["term.enter"] + BEAT, "tick", 0.4],
        *[[e["term.cubes"] + k * BEAT / 2, "drop", 0.55] for k in range(3)],
        [e["term.warn"], "ping", 0.5], [e["term.warn"] + 2 * BEAT, "ping", 0.45], [e["term.build"], "alert", 0.7], [e["term.build"], "stamp", 0.6],
        [bar(4), "whoosh", 0.7], [e["fw.github"], "pop", 0.6], [e["fw.shield"] - 0.45, "whoosh", 0.8], [e["fw.shield"], "shield", 1.0],
        [e["fw.label"], "split", 0.55], [e["fw.scan"], "scan", 0.7],
        [bar(8), "whoosh", 0.7], [e["pol.admin"], "pop", 0.6],
        *[[e[k], "slide", 0.8] for k in ("pol.card1", "pol.card2", "pol.card3")],
        *[[e[k] + 0.06, "ping", 0.45] for k in ("pol.card1", "pol.card2", "pol.card3")],
        [e["pol.arrive"], "drop", 0.5], [e["pol.scan"], "scan", 0.6], [e["pol.held"], "deny", 0.9], [e["pol.held"], "stamp", 0.6],
        [e["pol.pass"], "approve", 0.7],
        *[[e[k], "slide", 0.7] for k in ("lim.p1", "lim.p2", "lim.p3")],
        [bar(16), "whoosh", 0.7], [e["cta.q"], "pop", 0.5], [e["cta.toggle"], "tick", 0.6], [e["cta.toggle"] + 0.05, "approve", 0.6],
        [e["cta.comment"], "pop", 0.7], [e["cta.comment"] + 0.1, "ping", 0.5], [e["cta.brand"], "shimmer", 0.6],
    ]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx], key=lambda x: x[0])
    cues = {"duration": DURATION, "chapters": [[r(a), r(b_), n] for n, a, b_ in CHAPTERS], "events": ev, "sfx": sfx,
            "notes": "events from the voice's word times, snapped to the 122 BPM grid (beats / snares / downbeats)"}
    (D / "cues.json").write_text(json.dumps(cues, indent=1))
    for k, v in ev.items(): print(f"{k:12s} {v:7.3f}")
    print(f"{len(sfx)} foley cues -> {D / 'cues.json'}")


if __name__ == "__main__":
    main()
