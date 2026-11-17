"""
Optimize game audio for web delivery.

The original WAV is kept untouched (canonical source). This script creates
lightweight MP3 + OGG derivatives that are actually served by the app:

  public/assets/audio/background-music.wav
      -> public/assets/audio/background-music.mp3
      -> public/assets/audio/background-music.ogg

Requires an ffmpeg binary. This repo uses the `imageio-ffmpeg` wheel which
bundles one:

    pip install imageio-ffmpeg
    python scripts/optimize_audio.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

try:
    import imageio_ffmpeg
except ImportError:  # pragma: no cover
    imageio_ffmpeg = None

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "assets" / "audio"

# 96 kbps mono is plenty for a looped chiptune-ish BGM and keeps the file ~4x
# smaller than the 352 kbps WAV source.
MP3_BITRATE = "96k"
OGG_BITRATE = "64k"


def ffmpeg_exe() -> str:
    if imageio_ffmpeg is not None:
        return imageio_ffmpeg.get_ffmpeg_exe()
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise SystemExit(
        "ffmpeg tidak ditemukan. Jalankan: pip install imageio-ffmpeg"
    )


def human_kb(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def encode(src: Path, dst: Path, args: list[str]) -> None:
    cmd = [
        ffmpeg_exe(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(src),
        *args,
        str(dst),
    ]
    subprocess.run(cmd, check=True)
    print(f"  {src.name} -> {dst.name}: {human_kb(dst)}")


def main() -> None:
    sources = sorted(AUDIO_DIR.glob("*.wav"))
    if not sources:
        print("Tidak ada file WAV di", AUDIO_DIR)
        return

    print("== Audio ==")
    for src in sources:
        mp3 = src.with_suffix(".mp3")
        ogg = src.with_suffix(".ogg")
        encode(src, mp3, ["-vn", "-ac", "1", "-b:a", MP3_BITRATE, "-map_metadata", "-1"])
        encode(src, ogg, ["-vn", "-ac", "1", "-b:a", OGG_BITRATE, "-map_metadata", "-1"])

    total_wav = sum(p.stat().st_size for p in sources)
    total_mp3 = sum(p.stat().st_size for p in AUDIO_DIR.glob("*.mp3"))
    print(
        f"\nRuntime audio: {total_mp3 / 1024:.0f} KB mp3 "
        f"(source WAV kept on disk: {total_wav / 1024:.0f} KB)"
    )


if __name__ == "__main__":
    sys.exit(main())
