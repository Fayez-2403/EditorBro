#!/usr/bin/env bash
# Render one 9:16 reel variant sharp, in ~15 s segments (each retried up to 3 times), then join them losslessly and
# add the variant's mix (audio/<variant>/mix.mp3, else its voiceover). For Linux / Google Colab.
#   bash scripts/render_reel.sh gh2 ../out/github-trending-part2.mp4 [scale=2] [segment seconds=15]
set -uo pipefail
VARIANT="$1"; OUT="$2"; SCALE="${3:-2}"; SEG="${4:-15}"
cd "$(dirname "$0")/.."                                    # app/
ROOT="$(cd .. && pwd)"
DUR=$(python3 -c "import json;print(json.load(open('$ROOT/data/$VARIANT/audio.json'))['duration'])")
PARTS="$ROOT/out/parts_$VARIANT"; mkdir -p "$PARTS"; : > "$PARTS/list.txt"
i=0; a=0
while python3 -c "import sys;sys.exit(0 if $a < $DUR - 0.001 else 1)"; do
  b=$(python3 -c "print(min($a + $SEG, $DUR))")
  seg="$PARTS/seg_$(printf %02d $i).mp4"
  ok=0
  for try in 1 2 3; do
    echo "segment $i [$a, $b) try $try"
    if bun scripts/render.ts video --variant "$VARIANT" --scale "$SCALE" --workers 1 --fps 30 --samples 1 \
         --preset medium --crf 18 --noaudio --from "$a" --to "$b" --out "$seg" && [ -s "$seg" ]; then ok=1; break; fi
  done
  [ $ok = 1 ] || { echo "SEGMENT $i FAILED 3 TIMES"; exit 1; }
  echo "file '$seg'" >> "$PARTS/list.txt"
  i=$((i + 1)); a=$b
done
AUDIO="$ROOT/audio/$VARIANT/mix.mp3"; [ -f "$AUDIO" ] || AUDIO="$ROOT/audio/$VARIANT/voiceover.mp3"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$PARTS/list.txt" -c copy "$PARTS/joined.mp4" || { echo "JOIN FAILED"; exit 1; }
ffmpeg -y -loglevel error -i "$PARTS/joined.mp4" -i "$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest \
  -movflags +faststart "$OUT" || { echo "MUX FAILED"; exit 1; }
echo "ALL DONE: $OUT"
