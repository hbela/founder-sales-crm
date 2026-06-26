# sunshine-offer1 — assets

Drop these files here. They're served at
`<EMAIL_ASSET_BASE_URL>/email-assets/sunshine-offer1/<file>` and referenced by
`packages/emails/emails/SunshineOffer1.tsx`.

| File | Used by | Spec |
|------|---------|------|
| `hero.png` | `Hero` | JPG/PNG, ≤1 MB, 560–600px wide |
| `demo.gif` | `VideoBlock` (moving preview) | ≤1.5 MB, ≤720px wide, 12–15fps, <8s |
| `demo.mp4` | linked from the GIF (`href`) | the real video — never embedded as `<video>` |
| `hero-blur.png` | `VideoBlock` (frost-glass bed) | pre-blurred `hero.png` |

## Make the derived assets

```bash
# screen-recording.mp4 → optimized GIF
ffmpeg -y -i source.mp4 -t 8 \
  -vf "setpts=0.5*PTS,fps=15,scale=720:-1:flags=lanczos,split[s0][s1];\
       [s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a" \
  -loop 0 demo.gif

# hero.png → blurred bed for VideoBlock
ffmpeg -y -i hero.png -vf "boxblur=luma_radius=30:luma_power=3" hero-blur.png
```

While `pnpm dev:web` runs on :5173, the `email dev` preview shows these live
(the component falls back to `http://localhost:5173`). For a real send, set
`EMAIL_ASSET_BASE_URL` to your deployed https origin.
