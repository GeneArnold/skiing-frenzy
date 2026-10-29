# A contact sheet: every try whose name starts with a prefix, scaled down and labelled, in one picture,
# for choosing between them.  python3 tools/contact.py elf-jingles elf-sprinkles … > contact.png
#   python3 tools/contact.py --out art/source/contact-elves.png elf-
import argparse
import pathlib

from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("prefixes", nargs="+")
ap.add_argument("--out", required=True)
ap.add_argument("--thumb", type=int, default=360, help="height of each try")
a = ap.parse_args()

gen = pathlib.Path("art/source/gen")
rows = []
for prefix in a.prefixes:
    names = sorted({p.name.rsplit("-", 1)[0] for p in gen.glob(f"{prefix}*.png")})
    rows += [sorted(gen.glob(f"{n}-*.png"), key=lambda p: int(p.stem.rsplit("-", 1)[1])) for n in names]
font = ImageFont.load_default(size=28)
thumbs = [[Image.open(p).convert("RGB") for p in row] for row in rows]
thumbs = [[t.resize((round(t.width * a.thumb / t.height), a.thumb)) for t in row] for row in thumbs]
width = max(sum(t.width + 10 for t in row) for row in thumbs) + 10
sheet = Image.new("RGB", (width, len(rows) * (a.thumb + 50) + 10), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for r, (row, paths) in enumerate(zip(thumbs, rows)):
    y = 10 + r * (a.thumb + 50)
    x = 10
    for t, p in zip(row, paths):
        sheet.paste(t, (x, y + 40))
        d.text((x, y + 4), p.stem, fill=(255, 230, 102), font=font)
        x += t.width + 10
sheet.save(a.out)
print(a.out, sheet.size)
