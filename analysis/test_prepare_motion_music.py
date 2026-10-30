"""Pipeline integrity tests using generated local audio, never downloaded songs."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import wave

import numpy as np

import prepare_motion_music as music


class MusicPreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="motion-music-test-")
        self.root = Path(self.temp.name)
        self.source = self.root / "original.wav"
        times = np.arange(6 * music.SR) / music.SR
        pulse = np.zeros_like(times)
        for onset in np.arange(.25, 6, .5):
            pulse += np.where(times >= onset, np.exp(-np.maximum(0, times - onset) * 70), 0)
        signal = .6 * np.sin(2 * np.pi * 120 * times) * pulse
        with wave.open(str(self.source), "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(music.SR)
            handle.writeframes((signal * 32767).astype("<i2").tobytes())

    def tearDown(self):
        self.temp.cleanup()

    def args(self, *extra):
        return music.parser().parse_args(["--output-root", str(self.root / "project"), *extra])

    def test_fractional_grid_brackets_playback_and_has_no_duplicate_boundaries(self):
        grid = music.beat_grid(98.9609, .147, 15)
        self.assertLess(grid[0], 0)
        self.assertGreaterEqual(grid[-1], 15)
        self.assertTrue(all(right > left for left, right in zip(grid, grid[1:])))
        self.assertTrue(np.allclose(np.diff(grid), 60 / 98.9609))

    def test_real_clip_preserves_input_and_encodes_correct_duration(self):
        before = hashlib.sha256(self.source.read_bytes()).hexdigest()
        manifest = music.prepare(self.args("--input", str(self.source), "--start", "1", "--duration", "2",
                                           "--bpm", "120", "--first-beat", ".25"))
        output = self.root / "project"
        data = json.loads((output / "data/motion/audio.json").read_text())
        self.assertEqual(manifest["source_clip_start_seconds"], 1)
        self.assertEqual(manifest["source_clip_end_seconds"], 3)
        self.assertEqual(manifest["beat_span"], 4)
        self.assertEqual(len(data["features"]["rms"]), 200)
        self.assertEqual(json.loads((output / "data/motion/lyrics.json").read_text()), {"lines": []})
        audio = music.decode_audio(music.ffmpeg_binary(), output / "audio/motion/mix.mp3")
        self.assertAlmostEqual(len(audio) / music.SR, 2, places=2)
        self.assertEqual(hashlib.sha256(self.source.read_bytes()).hexdigest(), before)
        measured = [event[0] for event in data["onsets"]["kick"]]
        for expected in [.25, .75, 1.25, 1.75]:
            self.assertLess(min(abs(event - expected) for event in measured), .04)

    def test_not_enough_source_fails_before_writing_outputs(self):
        with self.assertRaisesRegex(ValueError, "Not enough source audio"):
            music.prepare(self.args("--input", str(self.source), "--duration", "8", "--bpm", "120", "--first-beat", "0"))
        self.assertFalse((self.root / "project/data/motion/audio.json").exists())

    def test_placeholder_is_silent_explicit_and_requires_force_to_replace(self):
        args = self.args("--placeholder", "--bpm", "120", "--beats", "4")
        manifest = music.prepare(args)
        self.assertEqual(manifest["status"], "placeholder_silent_provisional")
        self.assertIsNone(manifest["source_file"])
        audio = music.decode_audio(music.ffmpeg_binary(), self.root / "project/audio/motion/mix.mp3")
        self.assertEqual(float(np.max(np.abs(audio))), 0)
        with self.assertRaisesRegex(ValueError, "already exist"):
            music.prepare(args)
        collision = self.args("--input", str(self.root / "project/audio/motion/mix.mp3"),
                              "--duration", "1", "--bpm", "120", "--first-beat", "0", "--force")
        with self.assertRaisesRegex(ValueError, "managed output"):
            music.prepare(collision)


if __name__ == "__main__":
    unittest.main()
