#!/usr/bin/env python3
"""
Import a real BEFORE / AFTER photo pair into a transformation slot.

Usage:
  python3 tools/import-transformation.py <slot 01|02|03> <before-file> <after-file> \
      [--before-crop CX,TOP,BOTTOM] [--after-crop CX,TOP,BOTTOM]

Crops are fractions of the source image: CX = horizontal centre of the subject,
TOP / BOTTOM = vertical range to keep. The script fits a 4:5 box around that
range and exports 1200x1500 JPEG + WebP with the exact filenames the site uses.
HEIC input is supported on macOS (converted with `sips`).
"""
import sys, os, subprocess, tempfile, argparse
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets/img/transformations")

def load(path):
    if path.lower().endswith(".heic"):
        tmp = tempfile.mktemp(suffix=".jpg")
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "96", path, "--out", tmp], check=True, capture_output=True)
        path = tmp
    img = Image.open(path)
    img = ImageOps.exif_transpose(img).convert("RGB")
    return img

def crop45(img, cx=0.5, top=0.0, bottom=1.0, pad=0.04):
    W, H = img.size
    y0 = max(0, (top - pad) * H); y1 = min(H, (bottom + pad) * H)
    h = y1 - y0; w = h * 4 / 5
    if w > W:
        w = W; h = w * 5 / 4
        cy = (y0 + y1) / 2; y0 = max(0, min(H - h, cy - h / 2)); y1 = y0 + h
    x0 = cx * W - w / 2
    x0 = max(0, min(W - w, x0))
    return img.crop((int(x0), int(y0), int(x0 + w), int(y0 + h)))

def export(img, name):
    img = img.resize((1200, 1500), Image.LANCZOS)
    img.save(os.path.join(OUT, f"{name}.jpg"), "JPEG", quality=82, optimize=True, progressive=True)
    img.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=80, method=6)
    print("wrote", name)

def parse_crop(s):
    if not s: return {}
    cx, top, bottom = (float(v) for v in s.split(","))
    return dict(cx=cx, top=top, bottom=bottom)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slot"); ap.add_argument("before"); ap.add_argument("after")
    ap.add_argument("--before-crop", default=""); ap.add_argument("--after-crop", default="")
    a = ap.parse_args()
    export(crop45(load(a.before), **parse_crop(a.before_crop)), f"tf-{a.slot}-before")
    export(crop45(load(a.after), **parse_crop(a.after_crop)), f"tf-{a.slot}-after")
