# Finds white patches left inside a cut-out sprite (gaps between legs, poles and body that the edge
# flood in cutout.py can't reach), and either shows them or clears them.
#   python3 tools/holes.py img/santa-turn.png --show art/source/holes.png   colours each patch, numbered
#   python3 tools/holes.py img/santa-turn.png --clear 2 5                    clears patches 2 and 5
# Patches are numbered biggest first. White fur, beards and pompoms are patches too, so look first.
import argparse
from collections import deque

from PIL import Image, ImageDraw, ImageFont

WHITE = 232

ap = argparse.ArgumentParser()
ap.add_argument("png")
ap.add_argument("--show")
ap.add_argument("--clear", type=int, nargs="*", default=[])
ap.add_argument("--min", type=int, default=150, help="smallest patch, in pixels")
a = ap.parse_args()

im = Image.open(a.png).convert("RGBA")
w, h = im.size
px = im.load()
seen = bytearray(w * h)
patches = []
for y in range(h):
    for x in range(w):
        r, g, b, al = px[x, y]
        if seen[y * w + x] or al < 200 or min(r, g, b) <= WHITE:
            continue
        q = deque([(x, y)])
        seen[y * w + x] = 1
        cells = []
        while q:
            cx, cy = q.popleft()
            cells.append((cx, cy))
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    r2, g2, b2, a2 = px[nx, ny]
                    if a2 >= 200 and min(r2, g2, b2) > WHITE:
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
        if len(cells) >= a.min:
            patches.append(cells)
patches.sort(key=len, reverse=True)

if a.show:
    out = Image.new("RGBA", (w, h), (40, 60, 100, 255))
    out.alpha_composite(im)
    d = ImageDraw.Draw(out)
    font = ImageFont.load_default(size=22)
    colours = [(255, 0, 255), (0, 255, 255), (255, 140, 0), (0, 255, 0), (255, 255, 0), (120, 120, 255)]
    for i, cells in enumerate(patches, 1):
        c = colours[i % len(colours)]
        for cx, cy in cells:
            out.putpixel((cx, cy), c + (255,))
        mx = sum(p[0] for p in cells) // len(cells)
        my = sum(p[1] for p in cells) // len(cells)
        d.text((mx, my), str(i), fill=(0, 0, 0), font=font, stroke_width=3, stroke_fill=(255, 255, 255))
    out.save(a.show)
    print(f"{len(patches)} patches →", a.show)
for i in a.clear:
    for cx, cy in patches[i - 1]:
        px[cx, cy] = (255, 255, 255, 0)
if a.clear:
    im.save(a.png)
    print("cleared", a.clear)
