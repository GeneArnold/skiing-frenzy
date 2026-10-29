# Makes the app icons: Santa on skis on frosty blue. A stand-in until Gene picks an icon.
# Run from the project folder:  python3 tools/make-icons.py [cut-out .png]   (default img/santa.png)
import sys

from PIL import Image

BACKGROUND = (120, 180, 230, 255)  # frosty sky blue

santa = Image.open(sys.argv[1] if len(sys.argv) > 1 else "img/santa.png").convert("RGBA")
santa = santa.crop(santa.getbbox())


def icon(size, margin, background=BACKGROUND):
    img = Image.new("RGBA", (size, size), background)
    fit = (size - 2 * margin) / max(santa.size)
    s = santa.resize((round(santa.width * fit), round(santa.height * fit)), Image.LANCZOS)
    img.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return img


if __name__ == "__main__":
    icon(512, 36).save("icons/icon-512.png")
    icon(192, 14).save("icons/icon-192.png")
    icon(512, 100).save("icons/icon-maskable-512.png")  # Android crops these to a circle
    print("icons written")
