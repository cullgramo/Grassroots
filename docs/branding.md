# Logo and brand: how to change them

The logo is a **placeholder** for now: a dark green G on gold. Everything that shows it is made from two pictures, so a
new logo is one swap.

## Swapping in the real logo

1. Put the new pictures in `assets/brand/`:
   - `logo.png`: the full square app icon, 1024 x 1024, edge to edge, no transparency. Phones round the corners
     themselves.
   - `mark.png`: the symbol alone on a transparent background, 1024 x 1024, kept inside the middle 60%. Android
     crops the outside into a circle or rounded square.
2. Set the two brand colours in `scripts/make-brand-icons.py`: `BACKGROUND` (behind the symbol) and `INK`. Then set
   the same colours in:
   - `app.json`: `android.adaptiveIcon.backgroundColor` (the background colour) and the `expo-splash-screen`
     `backgroundColor` (the launch screen)
   - `public/manifest.webmanifest`: `background_color` and `theme_color`
   - `app/+html.tsx`: the `theme-color` meta tag
3. Run `python3 scripts/make-brand-icons.py` (needs Pillow: `pip install pillow`). It rewrites every icon below.
4. Replace `public/og.png` by hand. It's the 600 x 600 picture chat apps show beside a shared link, and is also used
   for the county and home pages.
5. The shared fixture page (`utils/sharePage.ts`) draws a small "G" badge in its `.mark` style. Swap it for an
   `<img src="/icons/icon-192.png">`.

## What the script makes

| File | Used for |
| --- | --- |
| `assets/images/icon.png` | The phone app's icon (iPhone and the Play Store listing) |
| `assets/images/android-icon-foreground.png`, `-background.png`, `-monochrome.png` | Android's adaptive and themed icons |
| `assets/images/splash-icon.png` | The launch screen |
| `assets/images/favicon.png` | The website's browser tab icon |
| `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` | "Add to Home Screen" on Android |
| `public/icons/apple-touch-icon.png` | "Add to Home Screen" on iPhone |

The phone app picks up a new icon only in a new build (see `docs/store-builds.md`). The website picks it up on its
next deploy.
