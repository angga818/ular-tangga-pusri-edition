"""
Optimize game assets for web delivery.

The original PNG/JPG files shipped with the project are kept untouched (they are
the canonical source assets). This script creates lightweight WebP derivatives
that are actually served by the app:

  public/assets/maps/mapN.jpg          -> public/assets/maps/mapN.webp
  public/assets/characters/*.png       -> public/assets/characters/*.webp
  public/assets/characters/*_avatar.png -> public/assets/characters/*_avatar.webp

Run with:  python scripts/optimize_assets.py
Requires:  pip install pillow
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MAPS_DIR = ROOT / "public" / "assets" / "maps"
CHARS_DIR = ROOT / "public" / "assets" / "characters"

# Board canvas is 1200x896, maps are rendered at ~2x on retina laptop screens.
MAP_MAX_WIDTH = 1600
MAP_QUALITY = 76

# Full body characters are displayed up to ~120px tall in-game.
CHAR_MAX_WIDTH = 320
CHAR_QUALITY = 82

# Avatars are displayed at 36-80px.
AVATAR_MAX_WIDTH = 160
AVATAR_QUALITY = 82


def human_kb(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def save_webp(image: Image.Image, target: Path, quality: int) -> None:
    image.save(target, "WEBP", quality=quality, method=6)


def optimize_maps() -> None:
    print("== Maps ==")
    for src in sorted(MAPS_DIR.glob("*.jpg")):
        dst = src.with_suffix(".webp")
        with Image.open(src) as im:
            im = im.convert("RGB")
            if im.width > MAP_MAX_WIDTH:
                height = round(im.height * MAP_MAX_WIDTH / im.width)
                im = im.resize((MAP_MAX_WIDTH, height), Image.LANCZOS)
            save_webp(im, dst, MAP_QUALITY)
        print(
            f"  {src.name}: {human_kb(src)} -> {dst.name}: {human_kb(dst)} "
            f"({im.width}x{im.height})"
        )


def optimize_characters() -> None:
    print("== Characters ==")
    for src in sorted(CHARS_DIR.glob("*.png")):
        dst = src.with_suffix(".webp")
        with Image.open(src) as im:
            im = im.convert("RGBA")
            if src.stem.endswith("_avatar"):
                max_width, quality = AVATAR_MAX_WIDTH, AVATAR_QUALITY
            elif src.stem == "pusri_logo":
                max_width, quality = AVATAR_MAX_WIDTH, AVATAR_QUALITY
            else:
                max_width, quality = CHAR_MAX_WIDTH, CHAR_QUALITY
            if im.width > max_width:
                height = round(im.height * max_width / im.width)
                im = im.resize((max_width, height), Image.LANCZOS)
            save_webp(im, dst, quality)
        print(
            f"  {src.name}: {human_kb(src)} -> {dst.name}: {human_kb(dst)} "
            f"({im.width}x{im.height})"
        )


def main() -> None:
    optimize_maps()
    optimize_characters()

    total_src = 0
    total_dst = 0
    for folder in (MAPS_DIR, CHARS_DIR):
        for path in folder.iterdir():
            if path.suffix.lower() in {".jpg", ".png"}:
                total_src += path.stat().st_size
            elif path.suffix.lower() == ".webp":
                total_dst += path.stat().st_size
    print(
        f"\nRuntime assets: {total_dst / 1024 / 1024:.2f} MB webp "
        f"(source originals kept on disk: {total_src / 1024 / 1024:.2f} MB)"
    )


if __name__ == "__main__":
    main()
