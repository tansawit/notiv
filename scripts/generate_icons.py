#!/usr/bin/env python3
"""Generate Notiv icon assets in multiple sizes.

Design direction:
- Geometric "N" with yellow highlight stripe
- Straight edges, square-ended diagonals, transparent background
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "icons"
SIZES = (16, 48, 128, 256, 512)

INK = (8, 12, 18, 255)
ACCENT = (246, 224, 0, 255)


def draw_parallelogram(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    width: float,
    color: tuple[int, int, int, int],
) -> tuple[float, float]:
    sx, sy = start
    ex, ey = end
    dx = ex - sx
    dy = ey - sy
    length = math.hypot(dx, dy) or 1.0
    # Normal that points to the "right" side of the diagonal.
    nx, ny = dy / length, -dx / length
    half = width * 0.5

    rect = [
        (sx + nx * half, sy + ny * half),
        (ex + nx * half, ey + ny * half),
        (ex - nx * half, ey - ny * half),
        (sx - nx * half, sy - ny * half),
    ]
    draw.polygon(rect, fill=color)
    return nx, ny


def draw_icon(size: int, target_size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    compact = target_size <= 20
    # Reference-like proportions: tall but not oversized.
    if compact:
        gx0, gx1 = size * 0.22, size * 0.78
        gy0, gy1 = size * 0.18, size * 0.86
        stem_w = size * 0.15
    else:
        gx0, gx1 = size * 0.22, size * 0.78
        gy0, gy1 = size * 0.16, size * 0.86
        stem_w = size * 0.118

    left_rect = [int(round(gx0)), int(round(gy0)), int(round(gx0 + stem_w)), int(round(gy1))]
    right_rect = [int(round(gx1 - stem_w)), int(round(gy0)), int(round(gx1)), int(round(gy1))]
    draw.rectangle(left_rect, fill=INK)
    draw.rectangle(right_rect, fill=INK)

    # Black diagonal spine.
    d_start = (gx0 + stem_w * 0.96, gy0 + stem_w * 0.10)
    d_end = (gx1 - stem_w * 0.96, gy1 - stem_w * 0.10)
    black_w = max(1.0, stem_w * 0.92)
    nx, ny = draw_parallelogram(draw, start=d_start, end=d_end, width=black_w, color=INK)

    # Yellow highlight diagonal to the right of the black spine.
    yellow_w = max(1.0, black_w * 0.50)
    offset = black_w * 0.56
    h_start = (d_start[0] + nx * offset, d_start[1] + ny * offset)
    h_end = (d_end[0] + nx * offset, d_end[1] + ny * offset)
    draw_parallelogram(draw, start=h_start, end=h_end, width=yellow_w, color=ACCENT)

    return image


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f"{size}.png"
        # Render oversampled, then downsample for smoother edges.
        oversample = 8
        high_res = draw_icon(size * oversample, size)
        final = high_res.resize((size, size), Image.Resampling.LANCZOS)
        final.save(path, format="PNG", optimize=True)
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
