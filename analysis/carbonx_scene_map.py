"""Carbon-X reel: projects/carbon-x/output/scene_map.json from the cue sheet (data/carbonx/cues.json) and the voice
(data/carbonx/lyrics.json): every chapter's time span, the brief's storyboard beat, what is on screen, its labels, the voice line
and the facts it rests on (projects/carbon-x/FACTS.md). Re-run after the voice changes; the times follow the take.

    python analysis/carbonx_scene_map.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "carbonx"; O = ROOT / "projects" / "carbon-x" / "output"

SCENES = {
    "hook": ("00-03 helix erupts from phone, 'DNA SE CHAT?!'", "DNA SE CHAT?! on frame 0; a luminous helix erupts from a phone; on 'baat' the helix talks (an ACGT bubble)",
             ["ILLUSTRATION"], []),
    "twist": ("03-06 ACGT letters become speech bubble", "the helix steps left, its base letters fly into a speech bubble; it spins on 'twist'; IMPORTANT TWIST!, a RESEARCH ONLY stamp",
              [], ["F6"]),
    "model": ("06-09 Carbon-X + 14.8B reveal", "HUGGING FACE + PARTNERS (Zhongguancun Academy, TIGEM / Univ. of Naples), CARBON-X letters drop, the 14.8B PARAMETERS counter, OPEN WEIGHTS + DNA + ENGLISH chips, receipt r_params",
              ["REAL SCREENSHOT"], ["F1", "F2", "F3"]),
    "both": ("09-12 plain English question floats alongside DNA", "A C G T tiles on their words; a DNA strip and an English question merge into one token stream; 6 DNA LETTERS = 1 TOKEN; CARBON-X; receipt r_6mer",
             ["REAL SCREENSHOT"], ["F1", "F4"]),
    "mutation": ("12-16 A->G mutation, clearly fictional", "an original research-chat panel: the sequence pasted (Ctrl+V), one A flips to G (A -> G), the question typed and sent",
                 ["HYPOTHETICAL EXAMPLE · FICTIONAL SEQUENCE", "DEMO UI · ILLUSTRATION"], ["F9"]),
    "answer": ("16-20 AI response card, marked reconstruction", "the message moves up; the Carbon-X response card types a RESEARCH PREDICTION and an EXPLANATION",
               ["ILLUSTRATIVE RECONSTRUCTION", "HYPOTHETICAL EXAMPLE"], ["F9", "F10"]),
    "bench": ("28-32 66.7% developer-reported benchmark", "TEAM-REPORTED · MODEL CARD; the 66.7% average gauge; the five benchmark bars with the card's numbers; NOT INDEPENDENT · NOT CLINICAL; receipt r_avg",
              ["REAL SCREENSHOT"], ["F5"]),
    "warn": ("32-37 giant warning 'NOT A DIAGNOSIS' (lowpass)", "CLINICAL PROOF x, MEDICAL DIAGNOSIS x, a greyed report clipboard, NOT A DIAGNOSIS slams on 'nahi'; the bed low-passed; receipt r_clinical",
             ["REAL SCREENSHOT"], ["F6"]),
    "open": ("20-24 open-weights / Apache-2.0 tags", "OPEN WEIGHTS + APACHE 2.0; TUMHARA INFRASTRUCTURE (a server); the weights drop in; the sensitive data slides inside and stays; HARDWARE PERMITTING; receipt r_avg (last lines)",
             ["REAL SCREENSHOT"], ["F2", "F7", "F8"]),
    "hw": ("24-28 cloud vs local hardware split, caveat", "NORMAL LAPTOP (a spinner, GUARANTEE NAHI) vs MODEL CARD: 1 x 80 GB GPU, bf16 weights; 'llama.cpp / GGUF not supported'",
           [], ["F8"]),
    "payoff": ("37-42 viewer payoff", "SCIENCE (the helix) and AI (a chat bubble) fuse: CROSSOVER, CRAZY HAI!, DNA + LANGUAGE · EK MODEL", [], []),
    "cta": ("42-50 CTA 'SAVE + COMMENT DNA'", "TRY KARNE SE PEHLE: model card padho / hardware check karo / sirf non-personal data; SAVE; COMMENT DNA on the drop", [], ["F8"]),
    "end": ("42-50 CTA (end card)", "the TECHPE TREK card: FOLLOW FOR AI + SCIENCE NEWS", [], []),
}


def main():
    cues = json.loads((D / "cues.json").read_text()); lay = json.loads((D / "layout.json").read_text())
    lines = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    out = []
    for a, b, name in cues["chapters"]:
        beat, shows, labels, facts = SCENES[name]
        out.append({"chapter": name, "start": a, "end": b, "brief_storyboard": beat, "on_screen": shows, "labels": labels, "facts": facts,
                    "voice": " ".join(l["text"] for l in lines if l["chapter"] == name),
                    "events": {k: v for k, v in cues["events"].items() if k.split(".")[0] == {"twist": "tw", "model": "mo", "both": "bo", "mutation": "mu",
                               "answer": "an", "bench": "be", "warn": "wa", "open": "op", "hw": "hw", "payoff": "pa", "cta": "cta", "end": "end", "hook": "hook"}[name]}})
    O.mkdir(parents=True, exist_ok=True)
    (O / "scene_map.json").write_text(json.dumps({"duration": cues["duration"], "fps": 60, "bpm": cues["bpm"], "voice_tempo": lay.get("tempo"),
                                                  "scratch_timing": lay.get("scratch", False), "note": "the voice drives the order: the brief's storyboard times are kept as labels, the chapters follow the script word for word",
                                                  "chapters": out}, indent=1, ensure_ascii=False), encoding="utf-8")
    for c in out: print(f"{c['chapter']:9s} {c['start']:6.2f}-{c['end']:6.2f}  {c['brief_storyboard']}")


if __name__ == "__main__":
    main()
