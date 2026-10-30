"""The Claude Duet reel storyboard as data -> data/duet/cues.json.

Every story event is the word that triggers it (data/duet/lyrics.json, the voice's own timestamps), snapped to the nearest
eighth note of the 124 BPM grid, so the picture moves with the music without leaving the word. A few events sit on the grid
itself: the three morning-brief pops on "morning" and the two beats after it, and the beat drop on the bar line nearest "Comment".
The foley (cue sheet `sfx`) is placed from the same events; analysis/duet_mix.py synthesizes it.

    python analysis/duet_cues.py
"""
import json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_duet import BEAT, BAR, E8, DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "duet"


def main():
    lay = json.loads((D / "layout.json").read_text())
    lines = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    words = {}
    for l in lines: words.setdefault(l["chapter"], []).extend(l["words"])
    snap = lambda t, q=E8: round(round(t / q) * q, 4)

    def w(ch, word, nth=0, end=False):
        hits = [x for x in words[ch] if re.sub(r"[,.!?;:…]+$", "", x["w"]).lower() == word.lower()]
        x = hits[nth]; return x["end"] if end else x["start"]
    ch = {c[2]: c[0] for c in lay["chapters"]}
    morning = snap(w("brief", "morning"), BEAT)
    cm = w("cta", "Comment"); drop = snap(cm, BAR) if abs(snap(cm, BAR) - cm) < 0.26 else snap(cm, BEAT)
    ev = {
        "hook.in": 0.0, "hook.ab": snap(w("hook", "Ab")), "hook.khud": snap(w("hook", "khud")), "hook.bhai": snap(w("hook", "bhai")),
        "hook.urgent": snap(w("hook", "urgent")),
        "duet.in": ch["duet"], "duet.anth": snap(w("duet", "Anthropic")), "duet.date": snap(w("duet", "21")), "duet.name": snap(w("duet", "Claude")),
        "duet.ann": snap(w("duet", "announce")),
        "brief.in": ch["brief"], "brief.opus": snap(w("brief", "Opus")), "brief.pro": snap(w("brief", "proactive")),
        "brief.apps": snap(w("brief", "connected")), "brief.morning": morning,
        "brief.c1": morning, "brief.c2": round(morning + BEAT, 4), "brief.c3": round(morning + 2 * BEAT, 4),
        "tasks.in": ch["tasks"], "tasks.kaam": snap(w("tasks", "kaam")), "tasks.zaroori": snap(w("tasks", "zaroori")),
        "tasks.update": snap(w("tasks", "updates")),
        "tw.in": ch["twist"], "tw.word": snap(w("twist", "twist")), "tw.email": snap(w("twist", "email")), "tw.pay": snap(w("twist", "payment")),
        "tw.del": snap(w("twist", "delete")), "tw.pehle": snap(w("twist", "pehle")), "tw.tap": snap(w("twist", "approval")),
        "tw.lesson": snap(w("twist", "maangta")),
        "hr.in": ch["hours"], "hr.cont": snap(w("hours", "continuously")), "hr.nahi": snap(w("hours", "nahi")),
        "hr.ghanton": snap(w("hours", "ghanton")), "hr.check": snap(w("hours", "check")),
        "av.in": ch["avail"], "av.res": snap(w("avail", "research")), "av.us": snap(w("avail", "US")), "av.pro": snap(w("avail", "Pro")),
        "av.max": snap(w("avail", "Max")), "av.wait": snap(w("avail", "waitlist")),
        "in.in": ch["india"], "in.india": snap(w("india", "India")), "in.nahi": snap(w("india", "nahi")),
        "cta.in": ch["cta"], "cta.useful": snap(w("cta", "useful")), "cta.noise": snap(w("cta", "notification")),
        "cta.comment": snap(cm), "cta.drop": drop, "cta.save": snap(w("cta", "save")),
        "end.in": ch["end"],
    }
    e = ev
    keys = lambda t0, n, dt=0.062, g=0.16: [[round(t0 + k * dt, 4), "key", g] for k in range(n)]
    sfx = [
        [0.0, "bass", 0.55], [0.0, "ping", 0.55], *keys(0.06, 30, 0.07, 0.05),
        [e["hook.ab"] - 0.32, "rewind", 0.55], [e["hook.ab"], "ping", 0.45], [e["hook.bhai"], "notif", 0.7], [e["hook.urgent"], "pop", 0.35],
        [e["duet.in"], "morph", 0.55], [e["duet.date"], "stamp", 0.5], [e["duet.name"] - 0.06, "hit", 0.3], [e["duet.ann"], "tick", 0.3],
        [e["brief.in"], "whoosh", 0.35], [e["brief.opus"], "tick", 0.35], [e["brief.apps"], "link", 0.4],
        [e["brief.c1"], "pop", 0.45], [e["brief.c2"], "pop", 0.45], [e["brief.c3"], "pop", 0.45],
        [e["tasks.in"], "zoom", 0.4], *keys(e["tasks.in"] + 0.1, 12, 0.07, 0.14), [e["tasks.kaam"], "zoom", 0.35], [e["tasks.update"], "notif", 0.4],
        [e["tw.in"] - 0.02, "scratch", 0.75], [e["tw.email"], "lock", 0.45], [e["tw.pay"], "lock", 0.45], [e["tw.del"], "lock", 0.45],
        [e["tw.tap"], "tap", 0.35], [e["tw.tap"] + 0.09, "unlock", 0.28], [e["tw.lesson"], "stamp", 0.25],
        [e["hr.in"], "whoosh", 0.3], [e["hr.cont"], "tick", 0.3], [e["hr.nahi"], "deny", 0.4], [e["hr.ghanton"], "clock", 0.4], [e["hr.check"], "ping", 0.35],
        [e["av.in"], "whoosh", 0.35], [e["av.res"], "tick", 0.3], [e["av.us"], "pin", 0.5], [e["av.pro"], "pop", 0.35], [e["av.max"], "pop", 0.35],
        [e["av.wait"], "stamp", 0.5],
        [e["in.in"], "spin", 0.45], [e["in.india"], "pin", 0.35], [e["in.nahi"], "glitch", 0.5],
        [e["cta.in"], "whoosh", 0.35], [e["cta.useful"], "pop", 0.35], [e["cta.noise"], "notifs", 0.25], [e["cta.drop"], "hit", 0.3],
        [e["cta.comment"], "pop", 0.4], [e["cta.save"], "save", 0.3], [e["end.in"], "shimmer", 0.4],
    ]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx if 0 <= t < DURATION], key=lambda x: x[0])
    (D / "cues.json").write_text(json.dumps({"duration": DURATION, "bpm": 60 / BEAT, "beat": BEAT, "bar": BAR, "chapters": lay["chapters"],
                                             "events": ev, "sfx": sfx,
                                             "notes": "events = the triggering word snapped to the nearest eighth note (brief pops on beats, the drop on a bar line)"},
                                            indent=1))
    for k, v in ev.items(): print(f"{k:14s} {v:7.3f}")
    print(f"{len(ev)} events, {len(sfx)} foley cues")


if __name__ == "__main__":
    main()
