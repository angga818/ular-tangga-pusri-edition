"""Generate an original royalty-free background loop for the game.

The soundtrack shipped in public/assets/audio/background-music.wav is produced
entirely from scratch with the Python standard library (no samples, no third
party assets), so it can be redistributed safely.

Usage:
    python scripts/generate_bgm.py

If you own a licensed track, drop it into public/assets/audio/ and point
public/assets/audio/manifest.json to it instead.
"""

from __future__ import annotations

import math
import random
import struct
import wave
from array import array
from pathlib import Path

SAMPLE_RATE = 22050
DURATION = 30.0
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)
TEMPO_BPM = 96.0
BEAT = 60.0 / TEMPO_BPM
BAR = BEAT * 4

# A calm, optimistic progression in the spirit of a friendly city-building game.
PROGRESSION = [
    # (root Hz, chord tones Hz)
    (130.81, [130.81, 164.81, 196.00]),  # C major
    (110.00, [110.00, 130.81, 164.81]),  # A minor
    (87.31, [87.31, 110.00, 130.81]),  # F major
    (98.00, [98.00, 123.47, 146.83]),  # G major
]

PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]


def build_buffer() -> array:
    buffer = array("f", [0.0]) * TOTAL_SAMPLES

    def add(start: float, duration: float, freq: float, amp: float, voice: str, decay: float = 0.45) -> None:
        begin = max(0, int(start * SAMPLE_RATE))
        length = int(duration * SAMPLE_RATE)
        end = min(TOTAL_SAMPLES, begin + length)
        if end <= begin:
            return
        for i in range(begin, end):
            t = (i - begin) / SAMPLE_RATE
            if voice == "pad":
                attack = min(1.0, t / 0.45)
                release = min(1.0, max(0.0, (duration - t) / 0.75))
                env = attack * release
            else:
                env = (1.0 - math.exp(-t / 0.004)) * math.exp(-t / decay)
                tail = min(1.0, max(0.0, (duration - t) / 0.05))
                env *= tail
            phase = 2.0 * math.pi * freq * t
            sample = math.sin(phase) + 0.28 * math.sin(phase * 2.0) + 0.08 * math.sin(phase * 3.0)
            buffer[i] += amp * env * sample

    def add_kick(start: float, amp: float = 0.30) -> None:
        begin = max(0, int(start * SAMPLE_RATE))
        length = int(0.22 * SAMPLE_RATE)
        end = min(TOTAL_SAMPLES, begin + length)
        for i in range(begin, end):
            t = (i - begin) / SAMPLE_RATE
            freq = 118.0 * math.exp(-t / 0.045) + 44.0
            env = math.exp(-t / 0.11)
            buffer[i] += amp * env * math.sin(2.0 * math.pi * freq * t)

    def add_hat(start: float, amp: float = 0.055) -> None:
        begin = max(0, int(start * SAMPLE_RATE))
        length = int(0.07 * SAMPLE_RATE)
        end = min(TOTAL_SAMPLES, begin + length)
        prev = 0.0
        for i in range(begin, end):
            t = (i - begin) / SAMPLE_RATE
            noise = random.uniform(-1.0, 1.0)
            bright = noise - prev  # simple high-pass
            prev = noise
            buffer[i] += amp * math.exp(-t / 0.022) * bright

    rng = random.Random(20251117)

    # Warm pad: one sustained chord per bar.
    for bar_index in range(int(DURATION / BAR)):
        root, chord = PROGRESSION[bar_index % len(PROGRESSION)]
        bar_start = bar_index * BAR
        for voice_index, freq in enumerate(chord):
            detune = 1.0 + (voice_index - 1) * 0.0016
            add(bar_start, BAR * 1.02, freq * detune, 0.055, "pad")
            add(bar_start, BAR * 1.02, freq * 0.5 * detune, 0.030, "pad")

    # Bass line: root on beat 1 and a fifth on beat 3.
    for bar_index in range(int(DURATION / BAR)):
        root, _ = PROGRESSION[bar_index % len(PROGRESSION)]
        bar_start = bar_index * BAR
        add(bar_start, BEAT * 1.6, root * 0.5, 0.16, "pluck", decay=0.55)
        add(bar_start + BEAT * 2, BEAT * 1.4, root * 0.5 * 1.5, 0.10, "pluck", decay=0.42)

    # Bell-style arpeggio on eighth notes.
    step = BEAT / 2
    total_steps = int(DURATION / step)
    for step_index in range(total_steps):
        t = step_index * step
        bar_pos = int(t / BAR) % len(PROGRESSION)
        _, chord = PROGRESSION[bar_pos]
        chord_tones = [f * 2.0 for f in chord] + [f * 4.0 for f in chord]
        tone = chord_tones[step_index % len(chord_tones)]
        if step_index % 4 == 2:
            tone = PENTATONIC[(step_index // 2 + bar_pos) % len(PENTATONIC)]
        amp = 0.085 if step_index % 2 == 0 else 0.055
        add(t, step * 1.8, tone, amp, "pluck", decay=0.30)

    # Occasional sparkle note for a light, adventurous mood.
    for _ in range(14):
        t = rng.uniform(0.0, DURATION - 1.2)
        tone = rng.choice(PENTATONIC) * 2.0
        add(t, 1.1, tone, 0.045, "pluck", decay=0.38)

    # Soft percussion pulse.
    for bar_index in range(int(DURATION / BAR)):
        bar_start = bar_index * BAR
        add_kick(bar_start, 0.26)
        add_kick(bar_start + BEAT * 2, 0.19)
        for eighth in range(4):
            add_hat(bar_start + eighth * BEAT + BEAT * 0.5, 0.048 if eighth % 2 else 0.032)

    # Gentle stereo-less noise floor for warmth.
    for i in range(TOTAL_SAMPLES):
        buffer[i] += rng.uniform(-1.0, 1.0) * 0.0035

    return buffer


def main() -> None:
    buffer = build_buffer()

    peak = max(abs(v) for v in buffer) or 1.0
    gain = 0.82 / peak
    frames = bytearray()
    for value in buffer:
        soft = math.tanh(value * gain * 1.25)
        frames += struct.pack("<h", int(max(-1.0, min(1.0, soft)) * 32767))

    out = Path(__file__).resolve().parents[1] / "public" / "assets" / "audio" / "background-music.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(bytes(frames))
    print(f"Wrote {out} ({out.stat().st_size / 1024:.0f} KB, {DURATION:.0f}s loop)")


if __name__ == "__main__":
    main()
