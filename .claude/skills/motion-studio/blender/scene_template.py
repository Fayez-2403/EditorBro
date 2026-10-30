"""Blender hero-shot template (headless, deterministic, resumable). The pack's recipe in miniature.

  blender -b --factory-startup -P .claude/skills/motion-studio/blender/scene_template.py -- \
      --out out/blend/frames --cards out/cards --start 1 --end 120 --res 540x960 --engine EEVEE --samples 32

- Every card PNG in --cards (transparent, e.g. from tools/motion-studio/render_html.mjs) becomes an emissive plane:
  colour = emission, alpha = opacity. Card k pops at 0.5 + 0.375 k s (dotted 8ths at 120 BPM), holds big for 0.15 s,
  flies 0.27 s on an arc and springs into a 2-column wall.
- A clay-toy hero (our own rounded block with eye slits, terracotta), a glossy dark floor, a soft key + fill, a cool rim.
- AgX, depth of field on the wall plane, a small camera drift that returns.
- Resumable: frames that already exist are skipped, so a killed render continues where it stopped.
- 9:16 by default. No GPU here: EEVEE is the fast path; Cycles with --samples 64 for finals of short shots.
Everything is computed from the frame number (no random, no simulation caches), so any frame renders on its own.
"""
import math, sys
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(k, d):
    return argv[argv.index(f"--{k}") + 1] if f"--{k}" in argv else d

OUT = Path(opt("out", "out/blend/frames")).resolve()
CARDS = Path(opt("cards", "")).resolve() if opt("cards", "") else None
START, END = int(opt("start", 1)), int(opt("end", 120))
RW, RH = (int(v) for v in opt("res", "540x960").split("x"))
ENGINE, SAMPLES, FPS = opt("engine", "EEVEE").upper(), int(opt("samples", 32)), 60
BRAND = tuple(int(opt("brand", "D97757")[i:i + 2], 16) / 255 for i in (0, 2, 4))
OUT.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------- motion (same formulas as scripts/motion.py)
def clamp01(u): return max(0.0, min(1.0, u))
def quintic(u):
    u = clamp01(u); return 16 * u ** 5 if u < 0.5 else 1 - (-2 * u + 2) ** 5 / 2
def spring(t, f=2.0, z=0.5):
    if t <= 0: return 0.0
    w = 2 * math.pi * f; wd = w * math.sqrt(1 - z * z)
    return 1 - math.exp(-z * w * t) * (math.cos(wd * t) + z * w / wd * math.sin(wd * t))
def to_lin(c): return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


# ---------------------------------------------------------------- scene
scene = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
scene.render.resolution_x, scene.render.resolution_y, scene.render.fps = RW, RH, FPS
scene.render.image_settings.file_format = "PNG"
for name in ([ "BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"] if ENGINE.startswith("EEVEE") else ["CYCLES"]):
    try: scene.render.engine = name; break
    except TypeError: pass
if scene.render.engine == "CYCLES":
    scene.cycles.samples, scene.cycles.use_denoising, scene.cycles.device = SAMPLES, True, "CPU"
else:
    try: scene.eevee.taa_render_samples = SAMPLES
    except AttributeError: pass
scene.view_settings.view_transform = "AgX"
for look in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try: scene.view_settings.look = look; break
    except TypeError: pass
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.006, 0.005, 0.006, 1)


def mat(name, base, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*base, 1); b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m


# floor (glossy, mirrors the cards) and back wall
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
bpy.context.object.data.materials.append(mat("floor", (0.02, 0.016, 0.014), rough=0.18))
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 4, 0), rotation=(math.pi / 2, 0, 0))
bpy.context.object.data.materials.append(mat("wall", (0.05, 0.03, 0.02), rough=0.7))

# hero: a clay block with bevels and two eye slits
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.32)); hero = bpy.context.object
hero.scale = (0.34, 0.24, 0.26)
bev = hero.modifiers.new("bevel", "BEVEL"); bev.width, bev.segments = 0.06, 6
hero.data.materials.append(mat("clay", to_lin(BRAND), rough=0.62))
for x in (-0.07, 0.07):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -0.125, 0.38)); e = bpy.context.object
    e.scale = (0.018, 0.004, 0.05); e.data.materials.append(mat("eye", (0.01, 0.01, 0.01), rough=0.3)); e.parent = hero
    e.matrix_parent_inverse = hero.matrix_world.inverted()

# lights: soft key + fill keep the brand colour honest, a cool rim
def area(name, loc, rot, energy, col, size):
    bpy.ops.object.light_add(type="AREA", location=loc, rotation=rot); l = bpy.context.object
    l.data.energy, l.data.color, l.data.size = energy, col, size
area("key", (-1.2, -2.2, 1.8), (math.radians(60), 0, math.radians(-28)), 70, (1, 0.97, 0.94), 1.6)
area("fill", (1.6, -2.0, 1.0), (math.radians(70), 0, math.radians(35)), 25, (1, 1, 1), 2.0)
area("rim", (0.9, 1.2, 1.4), (math.radians(-60), 0, math.radians(160)), 40, (0.7, 0.8, 1), 0.8)

# camera: 9:16, focus on the wall plane, tiny drift that returns
bpy.ops.object.camera_add(location=(0, -3.1, 0.95), rotation=(math.radians(84), 0, 0)); cam = bpy.context.object
scene.camera = cam; cam.data.lens = 46; cam.data.dof.use_dof = True; cam.data.dof.aperture_fstop = 2.8
cam.data.dof.focus_distance = 3.1

# cards: emissive planes from transparent PNGs
cards = []
for k, png in enumerate(sorted(CARDS.glob("*.png")) if CARDS and CARDS.exists() else []):
    img = bpy.data.images.load(str(png))
    m = bpy.data.materials.new(f"card{k}"); m.use_nodes = True
    try: m.blend_method = "BLEND"
    except AttributeError: pass
    nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 2.2
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"]); nt.links.new(tex.outputs["Alpha"], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs["Surface"])
    bpy.ops.mesh.primitive_plane_add(size=1, rotation=(math.pi / 2, 0, 0)); p = bpy.context.object
    ar = img.size[0] / max(img.size[1], 1); p.scale = (0.42, 0.42 / ar, 1); p.data.materials.append(m)
    cards.append(p)


def card_state(k, t):
    """Return (location, scale, visible) of card k at time t: pop from the bar, hold big, arc to its wall slot."""
    t0 = 0.5 + 0.375 * k
    bar = (0, 0.5, 1.55)
    col, row = k % 2, k // 2
    slot = (-0.95 + 1.9 * col, 1.0, 1.45 - row * 0.2)
    if t < t0: return bar, 0.0, False
    u = t - t0
    if u < 0.15 + 0.12:  # pop (spring) then hold big in the middle
        s = 1.6 * spring(u, 3.0, 0.55); return (0, 0.2, 1.2), max(s, 1e-3), True
    v = quintic((u - 0.27) / 0.27)
    lift = 4 * v * (1 - v) * 0.25
    loc = tuple(a + (b - a) * v for a, b in zip((0, 0.2, 1.2), slot)); loc = (loc[0], loc[1] - lift, loc[2] + lift * 0.5)
    land = spring(u - 0.54, 2.4, 0.6) if u > 0.54 else 0
    s = 1.6 + (0.5 - 1.6) * v + 0.04 * (land - 1 if u > 0.54 else 0)
    return loc, s, True


def pose(frame):
    t = (frame - 1) / FPS
    cam.location.x = 0.02 * math.sin(2 * math.pi * t / 10)  # a 2 cm drift that returns over 10 s
    look = 0.0
    for k, p in enumerate(cards):
        loc, s, vis = card_state(k, t)
        base = p.get("base_scale") or (p.scale[0], p.scale[1]); p["base_scale"] = base
        p.location = loc; p.scale = (base[0] * s, base[1] * s, 1); p.hide_render = not vis
        if vis and t - (0.5 + 0.375 * k) < 0.6: look = loc[0]
    hero.rotation_euler.z = -0.35 * look  # the hero turns toward the card in flight
    hero.location.z = 0.32 + 0.01 * math.sin(2 * math.pi * t * 2)


done = 0
for f in range(START, END + 1):
    path = OUT / f"{f:04d}.png"
    if path.exists():
        continue
    scene.frame_set(f); pose(f)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    done += 1
print(f"rendered {done} new frames, {END - START + 1 - done} skipped -> {OUT}")
