#!/usr/bin/env bash
# Contact sheets + transition strips + phone test from a rendered reel (master studio §17).
#   bash scripts/generate_contact_sheet.sh out/<file>.mp4 [t1 t2 ...]   (times = suspicious transitions for strips)
# Writes out/qa/: contact_sheet_<n>.png (1 fps, 5x4 tiles per sheet, split for long reels), strip_<t>.png (12 frames
# around each given time), phone_test.png (frame 1 + 3 s at 360 px wide), first3s.png (0-3 s at 4 fps).
set -euo pipefail
f="${1:?usage: generate_contact_sheet.sh <video> [times...]}"; shift || true
o="$(dirname "$0")/../out/qa"; mkdir -p "$o"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
n=$(python -c "import math;print(max(1, math.ceil(float('$dur')/20)))")
for ((i=0; i<n; i++)); do
  ffmpeg -v error -y -ss $((i*20)) -t 20 -i "$f" -vf "fps=1,scale=216:-1,tile=5x4:padding=4:color=white" -frames:v 1 "$o/contact_sheet_$((i+1)).png"
done
ffmpeg -v error -y -t 3 -i "$f" -vf "fps=4,scale=216:-1,tile=6x2:padding=4:color=white" -frames:v 1 "$o/first3s.png"
ffmpeg -v error -y -i "$f" -vf "select='eq(n\,0)+eq(n\,180)',scale=360:-1,tile=2x1:padding=8:color=white" -frames:v 1 "$o/phone_test.png"
for t in "$@"; do
  s=$(python -c "print(max(0, $t - 0.1))")
  ffmpeg -v error -y -ss "$s" -i "$f" -vf "scale=180:-1,tile=12x1:padding=2" -frames:v 1 "$o/strip_${t}.png"
done
ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,avg_frame_rate,width,height,pix_fmt,color_space -of json "$f" > "$o/probe.json"
echo "contact sheets: $n, strips: $#, -> $o"
