"""The GitHub package firewall reel v3 storyboard as data -> data/pkgfw/cues.json.

Every story event is the word that triggers it (data/pkgfw/lyrics.json, the voice's own timestamps), snapped to the
nearest eighth note of the 122 BPM grid so the UI moves in time with the music without leaving the word. The foley is
quiet UI sound only (keys, Enter, soft ticks, toggle clicks): no booms or impacts (user, 2026-10-21). v3 opens on a caution
buzzer (two pulses, 0 s and an eighth later), the one loud-ish effect, asked for with the caution hook (user, 2026-10-21).

    python analysis/pkgfw_cues.py
"""
import json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_pkgfw import BEAT

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "pkgfw"


def main():
    lay = json.loads((D / "layout.json").read_text())
    L = {l["chapter"]: l for l in json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]}
    E8 = BEAT / 2
    snap = lambda t: round(round(t / E8) * E8, 4)

    def w(ch, word, nth=0, end=False):
        hits = [x for x in L[ch]["words"] if re.sub(r"[,.!?;:…]+$", "", x["w"]).lower() == word.lower()]
        x = hits[nth]; return x["end"] if end else x["start"]
    ch = {c[2]: c[0] for c in lay["chapters"]}
    ev = {
        "alert.buzz1": 0.0, "alert.buzz2": round(E8, 4), "alert.npm": snap(w("alert", "npm")), "alert.agar": snap(w("alert", "Agar")),
        "alert.dekhen": snap(w("alert", "dekhen")),
        "hook.in": ch["hook"], "hook.type": ch["hook"], "hook.enter": snap(w("hook", "install", end=True)), "hook.flood": snap(w("hook", "aa")),
        "hook.bad": snap(w("hook", "kharab")), "hook.zoom": snap(w("hook", "toh")),
        "prob.in": ch["problem"], "prob.step": snap(w("problem", "install")), "prob.creds": snap(w("problem", "credentials")),
        "prob.nocode": snap(w("problem", "code")),
        "news.in": ch["news"], "news.title": snap(w("news", "package")), "news.preview": snap(w("news", "preview")),
        "how.in": ch["how"], "how.runner": snap(w("how", "runners")), "how.agent": snap(w("how", "coding")),
        "how.registry": snap(w("how", "registry")), "how.check": snap(w("how", "check")),
        "pol.in": ch["policy"], "pol.age": snap(w("policy", "din")), "pol.malware": snap(w("policy", "malware")),
        "pol.attest": snap(w("policy", "attestation")),
        "blk.in": ch["blocked"], "blk.notice": snap(w("blocked", "block")), "blk.link": snap(w("blocked", "link")),
        "blk.form": snap(w("blocked", "jaata")),
        "lim.in": ch["limits"], "lim.setup": snap(w("limits", "setup")), "lim.npm": snap(w("limits", "npm")),
        "lim.cloud": snap(w("limits", "Enterprise")),
        "cta.in": ch["cta"], "cta.toggle": snap(w("cta", "on")), "cta.comment": snap(w("cta", "Comment")), "cta.brand": snap(w("cta", "FIREWALL", end=True)),
    }
    e = ev
    sfx = [
        [e["alert.buzz1"], "buzz", 0.7], [e["alert.buzz2"], "buzz", 0.7], [e["alert.npm"], "tick", 0.25], [e["alert.agar"], "click", 0.3],
        *[[round(e["hook.in"] + 0.06 + k * 0.075, 4), "key", 0.22] for k in range(13)], [e["hook.enter"], "enter", 0.35],
        [e["hook.bad"], "tick", 0.3], [e["prob.step"], "tick", 0.22], [e["prob.creds"], "tick", 0.25],
        [e["news.title"], "tick", 0.2], [e["how.check"], "tick", 0.2],
        [e["pol.age"], "toggle", 0.3], [e["pol.malware"], "toggle", 0.3], [e["pol.attest"], "toggle", 0.3],
        *[[round(e["blk.in"] + 0.1 + k * 0.075, 4), "key", 0.2] for k in range(11)], [e["blk.notice"] - 0.3, "enter", 0.3],
        [e["blk.link"], "click", 0.3], [e["lim.setup"], "tick", 0.2], [e["lim.npm"], "tick", 0.2], [e["lim.cloud"], "tick", 0.2],
        [e["cta.toggle"], "toggle", 0.4], [e["cta.comment"], "click", 0.3],
    ]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx], key=lambda x: x[0])
    (D / "cues.json").write_text(json.dumps({"duration": lay["duration"], "chapters": lay["chapters"], "events": ev, "sfx": sfx,
                                             "notes": "events = the triggering word, snapped to the nearest eighth note; foley = quiet UI sounds"}, indent=1))
    for k, v in ev.items(): print(f"{k:12s} {v:7.3f}")
    print(f"{len(sfx)} quiet foley cues")


if __name__ == "__main__":
    main()
