#!/usr/bin/env python3
"""Makes every app, website and home-screen icon from two pictures, so changing the logo is one step.

The logo is a placeholder for now (a gold G). To change it:
  1. Replace assets/brand/logo.png: the full square icon, 1024x1024, edge to edge, no transparency
     (phones round the corners themselves).
  2. Replace assets/brand/mark.png: the symbol alone on a transparent background, 1024x1024, kept inside the
     middle 60% (Android crops the edges into a circle or a squircle).
  3. Set BACKGROUND below to the colour behind the symbol, and SPLASH to the launch screen's colour, in app.json too
     (android.adaptiveIcon.backgroundColor and the expo-splash-screen backgroundColor).
  4. Run: python3 scripts/make-brand-icons.py   (needs Pillow: pip install pillow)
  5. Replace public/og.png, the 600x600 picture chat apps show with shared links, by hand.
See docs/branding.md.

Run with --draw-placeholder to redraw the gold G sources first (only useful while the logo is a placeholder).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BACKGROUND = (227, 165, 43)  # gold, behind the symbol: #E3A52B
INK = (16, 40, 31)  # dark green, the symbol: #10281F
FONT = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'


def draw_placeholder():
    """The placeholder G: dark green on gold, the same as public/og.png."""
    size = 1024
    font = ImageFont.truetype(FONT, 600)

    def g(img, colour):
        d = ImageDraw.Draw(img)
        box = d.textbbox((0, 0), 'G', font=font)
        w, h = box[2] - box[0], box[3] - box[1]
        d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), 'G', font=font, fill=colour)
        return img

    g(Image.new('RGB', (size, size), BACKGROUND), INK).save(ROOT / 'assets/brand/logo.png', optimize=True)
    # The mark is smaller, so it stays inside Android's safe circle.
    mark = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    font = ImageFont.truetype(FONT, 440)
    g(mark, INK + (255,)).save(ROOT / 'assets/brand/mark.png', optimize=True)


def rounded(img, radius_share=0.22):
    """The logo with rounded corners and a transparent outside, for places the browser doesn't round (favicon, splash)."""
    img = img.convert('RGBA')
    mask = Image.new('L', img.size, 0)
    r = int(img.size[0] * radius_share)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius=r, fill=255)
    img.putalpha(mask)
    return img


def main():
    if '--draw-placeholder' in sys.argv:
        draw_placeholder()
    logo = Image.open(ROOT / 'assets/brand/logo.png').convert('RGB')
    mark = Image.open(ROOT / 'assets/brand/mark.png').convert('RGBA')
    out = lambda img, path, size: img.resize((size, size), Image.LANCZOS).save(ROOT / path, optimize=True)

    # Phone app (app.json).
    out(logo, 'assets/images/icon.png', 1024)
    out(mark, 'assets/images/android-icon-foreground.png', 512)
    out(Image.new('RGBA', (512, 512), BACKGROUND + (255,)), 'assets/images/android-icon-background.png', 512)
    white = Image.new('RGBA', mark.size, (255, 255, 255, 255))
    white.putalpha(mark.getchannel('A'))
    out(white, 'assets/images/android-icon-monochrome.png', 432)
    # Launch screen: the rounded logo, on the splash colour set in app.json.
    splash = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    splash.paste(rounded(logo.resize((560, 560), Image.LANCZOS)), (232, 232))
    splash.save(ROOT / 'assets/images/splash-icon.png', optimize=True)
    # Website tab icon.
    out(rounded(logo), 'assets/images/favicon.png', 48)
    # Website "Add to Home Screen" (public/manifest.webmanifest and app/+html.tsx).
    out(logo, 'public/icons/icon-192.png', 192)
    out(logo, 'public/icons/icon-512.png', 512)
    out(logo, 'public/icons/apple-touch-icon.png', 180)
    maskable = Image.new('RGB', (1024, 1024), BACKGROUND)
    maskable.paste(mark, (0, 0), mark)
    out(maskable, 'public/icons/maskable-512.png', 512)
    print('Icons written.')


if __name__ == '__main__':
    main()
