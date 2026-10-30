"""The Editor's Aura V2: face landmarks of the developer in the placeholder backshot (its first 10 s), for the chrome "aura" mask
the engine renders on his face. MediaPipe Face Landmarker (Google's public model, Apache-2.0, out/models/face_landmarker.task)
in video mode on app/public/aura/frames/ph (608x1080, 30 fps); each landmark is smoothed per continuous shot (zero-phase,
split at the clip's own cuts) so the mask holds still; gaps of a few frames are interpolated. The mesh's triangles and UVs come
from MediaPipe's canonical face model (out/models/canonical_face_model.obj). Writes data/aura_v2/face.json and debug overlays.
    python analysis/aura_v2_face.py
"""
import json, pathlib
import numpy as np, cv2, mediapipe as mp

ROOT = pathlib.Path(__file__).resolve().parent.parent
PH = ROOT / "app/public/aura/frames/ph"; MODELS = ROOT / "out/models"; OUT = ROOT / "data/aura_v2"; DBG = ROOT / "out/wip_aura_v2/face"
N = 300   # the first 10 s at 30 fps


def canonical():
    """Triangles (vertex indices) and a UV per vertex. The OBJ's faces pair vertex and UV indices that differ ("f v/vt ..."),
    so each vertex takes the UV its face corners name."""
    tris, vts, uv_of = [], [], {}
    for l in (MODELS / "canonical_face_model.obj").read_text().splitlines():
        if l.startswith("vt "): vts.append([float(a) for a in l.split()[1:3]])
        if l.startswith("f "):
            for c in l.split()[1:4]:
                v, vt = (int(q) - 1 for q in c.split("/")[:2]); tris.append(v); uv_of.setdefault(v, vts[vt] if vt < len(vts) else None)
    if any(v is None for v in uv_of.values()):   # (vt lines may follow the faces)
        uv_of = {}
        for l in (MODELS / "canonical_face_model.obj").read_text().splitlines():
            if l.startswith("f "):
                for c in l.split()[1:4]: v, vt = (int(q) - 1 for q in c.split("/")[:2]); uv_of.setdefault(v, vts[vt])
    uv = [round(x, 5) for v in range(468) for x in uv_of[v]]
    return tris, uv


def main():
    OUT.mkdir(parents=True, exist_ok=True); DBG.mkdir(parents=True, exist_ok=True)
    opts = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(MODELS / "face_landmarker.task")),
        running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=1, min_face_detection_confidence=0.3, min_face_presence_confidence=0.3, min_tracking_confidence=0.3)
    L = np.full((N, 468, 3), np.nan, np.float32); grey = []
    with mp.tasks.vision.FaceLandmarker.create_from_options(opts) as det:
        for i in range(N):
            im = cv2.imread(str(PH / f"{i:05d}.jpg")); grey.append(cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), (76, 135)).astype(np.float32))
            r = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(im, cv2.COLOR_BGR2RGB)), int(i * 1000 / 30))
            if r.face_landmarks: L[i] = [[p.x, p.y, p.z] for p in r.face_landmarks[0][:468]]
    found = ~np.isnan(L[:, 0, 0])
    # the clip's own cuts: big picture changes between frames
    diff = np.array([0] + [np.abs(grey[i] - grey[i - 1]).mean() for i in range(1, N)]); cuts = [0] + [i for i in range(1, N) if diff[i] > 18] + [N]
    S = L.copy()
    for a, b in zip(cuts[:-1], cuts[1:]):
        seg = L[a:b]; ok = ~np.isnan(seg[:, 0, 0])
        if ok.sum() < 3: S[a:b] = np.nan; continue
        idx = np.arange(b - a)
        for k in range(468):
            for c in range(3):
                v = np.interp(idx, idx[ok], seg[ok, k, c])   # fill short gaps inside the shot
                w = 4; ker = np.exp(-0.5 * (np.arange(-w, w + 1) / 2.0) ** 2); ker /= ker.sum()
                pad = np.pad(v, w, mode="edge"); S[a:b, k, c] = np.convolve(pad, ker, "valid")
        first, last = idx[ok][0], idx[ok][-1]
        S[a:a + first] = np.nan; S[a + last + 1:b] = np.nan   # no extrapolation past the detections
    tris, uv = canonical()
    frames = [None if np.isnan(S[i, 0, 0]) else np.round(S[i].reshape(-1), 4).tolist() for i in range(N)]
    (OUT / "face.json").write_text(json.dumps({"fps": 30, "n": N, "w": 608, "h": 1080, "frames": frames, "tris": tris, "uv": uv,
        "cuts": cuts[1:-1], "source": "MediaPipe Face Landmarker on app/public/aura/frames/ph 0-299 (the backshot's first 10 s)"}))
    print(f"face: {int(found.sum())}/{N} frames detected, {sum(f is not None for f in frames)} after per-shot fill; cuts at {cuts[1:-1]}")
    for i in (5, 45, 75, 110, 150, 200, 260, 290):   # debug: the mesh drawn on the frame
        im = cv2.imread(str(PH / f"{i:05d}.jpg"))
        if frames[i] is not None:
            P = (np.array(frames[i]).reshape(-1, 3)[:, :2] * [608, 1080]).astype(int)
            for t in range(0, len(tris), 3):
                cv2.polylines(im, [P[tris[t:t + 3]]], True, (224, 214, 63), 1, cv2.LINE_AA)
        cv2.imwrite(str(DBG / f"dbg_{i:03d}.jpg"), im)


if __name__ == "__main__":
    main()
