# Email assets (self-hosted CDN)

Everything under `apps/web/public/` is served at the site root, so a file at:

```
apps/web/public/email-assets/2026-05-launch/hero.png
```

is reachable at:

```
https://<your-deployed-web-origin>/email-assets/2026-05-launch/hero.png
```

Commit + deploy = instant CDN. No S3/Cloudinary needed.

## Layout

```
email-assets/
  <campaign-name>/        # lowercase, dashes only
    hero.png
    demo.gif
    demo.mp4              # linked from the GIF, never embedded as <video>
    hero-blur.png         # pre-blurred bed for VideoBlock
```

## Rules (email-safe)

- **Absolute URLs only when sending.** Relative paths work in browser preview but
  break in inboxes. Use `assetUrl(path, EMAIL_ASSET_BASE_URL)` from `@founder-crm/emails`.
- Filenames: lowercase, dashes only (`hero-image.jpg`, not `Hero Image.jpg`).
- Images: JPG/PNG, ≤ 1 MB, max 600px wide (hero/card width is 560px).
- GIFs: ≤ 1.5 MB, max 720px wide, 12–15 fps, under 8s.
- Video: ship the MP4 here but link to it from a GIF thumbnail.
- **Version filenames instead of overwriting** (`hero-v2.jpg`) — clients cache hard.

## Pre-blur a hero for VideoBlock

```bash
ffmpeg -y -i hero.png -vf "boxblur=luma_radius=30:luma_power=3" hero-blur.png
```

## Optimize a screen recording → GIF

```bash
ffmpeg -y -i source.mp4 -t 8 \
  -vf "setpts=0.5*PTS,fps=15,scale=720:-1:flags=lanczos,split[s0][s1];\
       [s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a" \
  -loop 0 demo.gif
# target < 1.5 MB; if larger drop to 12fps / 600px / 5–6s
```
