"""The Claude reveals reel storyboard as data -> data/reveals/cues.json.

Events are either fixed choreography marks (script_reveals.MARKS, on the grid) or the word that triggers them
(data/reveals/lyrics.json, the voice's own timestamps), snapped to the nearest eighth note (0.25 s). The foley list is the
comedy and transition sound (synthesized in reveals_mix.py), each on an event.

    python analysis/reveals_cues.py
"""
import json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals_v1 import BEAT, DURATION, CHAPTERS, MARKS, CARDS

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "reveals_v1"


def main():
    L = {l["key"]: l for l in json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]}
    E8 = BEAT / 2
    snap = lambda t: round(round(t / E8) * E8, 4)

    def w(key, word, nth=0, end=False):
        hits = [x for x in L[key]["words"] if re.sub(r"[,.!?;:…]+$", "", x["w"]).lower() == word.lower()]
        x = hits[nth]; return x["end"] if end else x["start"]
    ev = dict(MARKS)
    ev.update({
        "post.t1": snap(w("posted", "Claude")), "post.t2": snap(w("posted", "six")), "post.t3": snap(w("posted", "trust")),
        "r1.title": snap(w("r1", "wildfire")), "r1.label": snap(w("r1", "prototype")), "r1.hot": snap(w("r1", "hot")),
        "r1.model": snap(w("r1", "Opus")),
        "r2.title": snap(w("r2", "Chess")), "r2.model": snap(w("r2", "Sonnet")), "r2.peek": snap(L["playable"]["start"]),
        "r3.pages": snap(w("r3a", "120")), "r3.font": snap(w("r3a", "font")), "r3.model": snap(w("r3a", "Opus")),
        "r3.haiku": snap(w("r3b", "Haiku")), "r3.twenty": snap(w("r3b", "bees")), "r3.js": snap(w("r3b", "JavaScript")),
        "r4.title": snap(w("r4", "electromagnetic")), "r4.push": snap(w("r4", "push")), "r4.model": snap(w("r4", "Opus")),
        "r4.noway": snap(L["noway"]["start"]),
        "r5.title": snap(w("r5a", "cardiology")), "r5.fellow": snap(w("r5a", "fellow")), "r5.label": snap(w("r5a", "trainees")),
        "r5.range1": snap(w("r5b", "Notebook")), "r5.range2": snap(w("r5b", "medical")), "r5.range3": snap(w("r5b", "range")),
        "fin.six": snap(w("cta", "Six")), "fin.five": snap(w("cta", "Five")), "fin.q": snap(w("cta", "sawaal")),
    })
    e = ev
    sfx = [
        [e["hit1"] + 0.25, "slap", 0.7], [e["zoom2"], "whoosh", 0.8], [e["hit2"], "slap", 0.8], [e["hit3"], "slap", 0.9],
        [e["drop"] - 0.05, "chair", 0.7], [e["boing"], "boing", 1.0], [e["boing"], "confetti", 0.8], [e["land"], "thud", 0.7],
        [e["dive"] + 0.1, "dive", 0.8],
        [e["post.in"] + 0.2, "pop", 0.4], *[[t, "scroll", 0.35] for t in (8.5, 10.0, 11.5, 13.0, 14.25)],
        [e["post.t1"], "tick", 0.4], [e["post.t2"], "tick", 0.45], [e["post.t3"], "tick", 0.5],
        [e["post.collapse"], "suck", 0.6], [e["post.launch"], "whoosh", 0.8],
        [e["r1.ember"], "fizz", 0.6], [e["r1.clip"], "whoosh", 0.6], [e["r1.title"], "tick", 0.35], [e["r1.model"], "tick", 0.35],
        [e["r1.collapse"], "suck", 0.6],
        [e["r2.paper"], "paper", 0.7], [e["r2.num"] + 0.05, "scribble", 0.6], [e["r2.title"], "scribble", 0.4],
        [e["r2.peek"] - 0.1, "peek", 0.6], [e["r2.strike"], "knock", 0.9],
        [e["r3.swirl"], "flutter", 0.6], [e["r3.num"], "stamp", 0.8], [e["r3.clipC2"], "swish", 0.5], [e["r3.bird"], "flap", 0.6],
        [e["r3.clipF"] - 0.2, "zap", 0.5], [e["r3.rip"], "rip", 1.0],
        [e["r4.line"], "zap", 0.6], [e["r4.web"], "crackle", 0.45], [e["r4.web"] + 0.75, "crackle", 0.4], [e["r4.clip"], "zap", 0.5],
        [e["r4.noway"] - 0.1, "peek", 0.5], [e["r4.pull"], "suck", 0.8],
        *[[t, "beep", 0.45] for t in (e["r5.beat1"], e["r5.beat2"], 74.75)],
        [e["fin.impact"] + 0.75, "clink", 0.5], *[[e["fin.cuts"] + k * 0.25, "slap", 0.6] for k in range(3)],
        [e["fin.title"], "whoosh", 0.6], [e["fin.cta"], "pop", 0.5],
    ]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx], key=lambda x: x[0])
    (D / "cues.json").write_text(json.dumps({"duration": DURATION, "chapters": [[s, e_, c] for c, s, e_ in CHAPTERS], "events": ev,
                                             "cards": CARDS, "sfx": sfx,
                                             "notes": "events = fixed marks or the triggering word, snapped to the nearest eighth note"}, indent=1))
    for k, v in ev.items(): print(f"{k:14s} {v:7.3f}")
    print(f"{len(ev)} events, {len(sfx)} foley cues")


if __name__ == "__main__":
    main()
