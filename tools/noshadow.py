# Clears a grey ground shadow left under a cut-out: light, colourless pixels in the bottom of the picture.
#   python3 tools/noshadow.py img/turkey-scared.png [--from 0.75]
import argparse

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("png")
ap.add_argument("--from", dest="start", type=float, default=0.75, help="where the bottom starts, as a share of the height")
a = ap.parse_args()
im = Image.open(a.png).convert("RGBA")
px = im.load()
w, h = im.size
for y in range(int(h * a.start), h):
    for x in range(w):
        r, g, b, al = px[x, y]
        if al and min(r, g, b) > 150 and max(r, g, b) - min(r, g, b) < 24:
            px[x, y] = (0, 0, 0, 0)
im.save(a.png)
