"""The Carbon-X reel storyboard as data -> data/carbonx/cues.json (the duet_cues.py pattern).

Every story event is the word that triggers it (data/carbonx/lyrics.json, the voice's own timestamps) snapped to the nearest
eighth note of the 112 BPM grid; the four base letters pop on their own words, the CTA drop sits on the bar line nearest
"comment". The foley (`sfx`) follows the brief: an impact on frame 0, UI blips on the model reveal, the paste and the answer
card, a lowpass on the disclaimer (in the score), a stinger at the end. analysis/carbonx_mix.py synthesizes it.

    python analysis/carbonx_cues.py
"""
import json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_carbonx import BEAT, BAR, E8, DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "carbonx"


def main():
    lay = json.loads((D / "layout.json").read_text())
    lines = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    words = {}
    for l in lines: words.setdefault(l["chapter"], []).extend(l["words"])
    snap = lambda t, q=E8: round(round(t / q) * q, 4)

    def w(ch, word, nth=0, end=False):
        hits = [x for x in words[ch] if re.sub(r"[,.!?;:…]+$", "", x["w"]).lower() == word.lower()]
        if not hits: raise KeyError(f"{ch}: no word {word!r} in {[x['w'] for x in words[ch]]}")
        x = hits[nth]; return x["end"] if end else x["start"]
    ch = {c[2]: c[0] for c in lay["chapters"]}
    cm = w("cta", "comment"); drop = snap(cm, BAR) if abs(snap(cm, BAR) - cm) < 0.27 else snap(cm, BEAT)
    ev = {
        "hook.in": 0.0, "hook.dna": snap(w("hook", "DNA")), "hook.baat": snap(w("hook", "baat")), "hook.karega": snap(w("hook", "karega")),
        "tw.in": ch["twist"], "tw.haan": snap(w("twist", "Haan")), "tw.lekin": snap(w("twist", "lekin")), "tw.twist": snap(w("twist", "twist")),
        "mo.in": ch["model"], "mo.hf": snap(w("model", "Hugging")), "mo.name": snap(w("model", "Carbon-X")), "mo.release": snap(w("model", "release")),
        "mo.num": snap(w("model", "14.8")), "mo.params": snap(w("model", "parameter")), "mo.open": snap(w("model", "open")),
        "mo.ai": snap(w("model", "model")),
        "bo.in": ch["both"], "bo.dna": snap(w("both", "DNA")), "bo.a": snap(w("both", "A")), "bo.c": snap(w("both", "C")),
        "bo.g": snap(w("both", "G")), "bo.t": snap(w("both", "T")), "bo.eng": snap(w("both", "English")), "bo.saath": snap(w("both", "saath")),
        "bo.process": snap(w("both", "process")),
        "mu.in": ch["mutation"], "mu.socho": snap(w("mutation", "Socho")), "mu.seq": snap(w("mutation", "sequence")),
        "mu.paste": snap(w("mutation", "paste")), "mu.pooche": snap(w("mutation", "pooche")), "mu.mut": snap(w("mutation", "mutation")),
        "mu.effect": snap(w("mutation", "effect")), "mu.kya": snap(w("mutation", "kya")),
        "an.in": ch["answer"], "an.model": snap(w("answer", "Model")), "an.pred": snap(w("answer", "prediction")),
        "an.expl": snap(w("answer", "explanation")), "an.end": snap(w("answer", "hai", end=True)),
        "be.in": ch["bench"], "be.team": snap(w("bench", "Team")), "be.five": snap(w("bench", "five-benchmark")),
        "be.avg": snap(w("bench", "average")), "be.num": snap(w("bench", "66.7")), "be.report": snap(w("bench", "report")),
        "wa.in": ch["warn"], "wa.clinical": snap(w("warn", "clinical")), "wa.medical": snap(w("warn", "medical")),
        "wa.diag": snap(w("warn", "diagnosis")), "wa.nahi": snap(w("warn", "nahi")),
        "op.in": ch["open"], "op.weights": snap(w("open", "weights")), "op.fayda": snap(w("open", "fayda")),
        "op.res": snap(w("open", "Researchers")), "op.infra": snap(w("open", "infrastructure")), "op.sens": snap(w("open", "sensitive")),
        "op.analyze": snap(w("open", "analyze")), "op.hw": snap(w("open", "hardware")),
        "hw.in": ch["hw"], "hw.detail": snap(w("hw", "detail")), "hw.laptop": snap(w("hw", "laptop")), "hw.smooth": snap(w("hw", "smoothly")),
        "hw.guar": snap(w("hw", "guarantee")), "hw.nahi": snap(w("hw", "nahi")),
        "pa.in": ch["payoff"], "pa.science": snap(w("payoff", "Science")), "pa.ai": snap(w("payoff", "AI")),
        "pa.cross": snap(w("payoff", "crossover")), "pa.crazy": snap(w("payoff", "crazy")),
        "cta.in": ch["cta"], "cta.model": snap(w("cta", "Model")), "cta.card": snap(w("cta", "card")), "cta.save": snap(w("cta", "save")),
        "cta.comment": snap(cm), "cta.drop": drop, "cta.dna": snap(w("cta", "DNA")),
        "end.in": ch["end"],
    }
    e = ev
    keys = lambda t0, n, dt=0.055, g=0.1: [[round(t0 + k * dt, 4), "key", g] for k in range(n)]
    sfx = [
        [0.0, "impact", 0.6], [0.0, "erupt", 0.5], [e["hook.dna"], "pop", 0.35], [e["hook.baat"], "bubble", 0.4],
        [e["tw.haan"], "scatter", 0.35], [e["tw.twist"], "stamp", 0.3],
        [e["mo.in"], "whoosh", 0.3], [e["mo.name"], "blip", 0.5], [e["mo.num"], "counter", 0.3], [e["mo.num"] + 0.55, "tick", 0.3],
        [e["mo.open"], "pop", 0.3],
        [e["bo.dna"], "tick", 0.25], [e["bo.a"], "note", 0.3], [e["bo.c"], "note2", 0.3], [e["bo.g"], "note3", 0.3], [e["bo.t"], "note4", 0.3],
        [e["bo.eng"], "pop", 0.3], [e["bo.saath"], "link", 0.35], [e["bo.process"], "flow", 0.3],
        [e["mu.in"], "whoosh", 0.25], *keys(e["mu.socho"] + 0.1, 8), [e["mu.paste"], "blip", 0.5], [e["mu.paste"] + 0.04, "paste", 0.35],
        [e["mu.mut"], "flip", 0.45], [e["mu.kya"], "ping", 0.3],
        [e["an.in"], "blip", 0.4], *keys(e["an.pred"], 7, 0.05, 0.07), *keys(e["an.expl"], 9, 0.05, 0.07),
        [e["be.team"], "tick", 0.25], *[[round(e["be.five"] + j * E8 / 2, 4), "bar", 0.25] for j in range(5)], [e["be.num"], "counter", 0.3],
        [e["be.num"] + 0.6, "ding", 0.35], [e["be.report"], "stamp", 0.25],
        [e["wa.in"] - 0.02, "down", 0.45], [e["wa.nahi"], "bigstamp", 0.5],
        [e["op.in"], "unlock", 0.3], [e["op.weights"], "pop", 0.3], [e["op.infra"], "rack", 0.3], [e["op.sens"], "lock", 0.4], [e["op.hw"], "tick", 0.3],
        [e["hw.in"], "whoosh", 0.25], [e["hw.laptop"], "pop", 0.3], [e["hw.smooth"], "spin", 0.3], [e["hw.guar"], "pop", 0.3], [e["hw.nahi"], "deny", 0.35],
        [e["pa.in"], "whoosh", 0.3], [e["pa.cross"], "fuse", 0.4],
        [e["cta.model"], "pop", 0.3], [e["cta.card"], "pop", 0.3], [e["cta.save"], "save", 0.3], [e["cta.comment"], "pop", 0.35],
        [e["end.in"], "stinger", 0.5],
    ]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx if 0 <= t < DURATION], key=lambda x: x[0])
    (D / "cues.json").write_text(json.dumps({"duration": DURATION, "bpm": 60 / BEAT, "beat": BEAT, "bar": BAR, "chapters": lay["chapters"],
                                             "events": ev, "sfx": sfx, "scratch": lay.get("scratch", False),
                                             "notes": "events = the triggering word snapped to the nearest eighth note (the drop on a bar line)"},
                                            indent=1))
    for k, v in ev.items(): print(f"{k:12s} {v:7.3f}")
    print(f"{len(ev)} events, {len(sfx)} foley cues" + ("  (SCRATCH timing)" if lay.get("scratch") else ""))


if __name__ == "__main__":
    main()
