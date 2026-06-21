# @founder-crm/video-generator

Markdown in → screenshots + narration → product demo video out.

```
USER_GUIDE.md → scenes.json → screenshots → narration.mp3 → Remotion → demo.mp4
```

## Pipeline

| Step | Command | Output |
| --- | --- | --- |
| 1. Markdown → scenes | `pnpm video:scenes` | `src/output/scenes.json` |
| 2. Capture screenshots | `pnpm video:screens` | `public/screenshots/*.png` |
| 3. Generate narration | `pnpm video:voice` | `public/audio/*.mp3` |
| 4. Render video | `pnpm video:render` | `src/output/demo.mp4` |

Run the whole pipeline:

```bash
pnpm video
```

## Studio (visual preview)

Iterate on the video template without a full render — scrub the timeline, edit
`DemoVideo.tsx`, and see changes hot-reload instantly:

```bash
pnpm video:studio
```

This generates a props file from your current scenes/screenshots/audio, then
opens the Remotion Studio at `http://localhost:3000`. Requires `video:scenes`
(and ideally `video:screens` + `video:voice`) to have run first so there's
content to preview.

> **Note:** `--port 3000` prevents a conflict with the `PORT=4000` env var used
> by the API server. This package pins `zod@4.3.6` (the version Remotion
> requires) — the openai SDK peer-dep warning is non-fatal and TTS works fine.

## Setup

1. **Install Playwright's browser** (one-time):

   ```bash
   pnpm video:browsers
   ```

2. **Configure env.** Copy `.env.example` → `.env` (or put keys in the monorepo root `.env`):

   - `APP_URL` — the running web app to screenshot (default `http://localhost:5173`).
   - `LOGIN_EMAIL` / `LOGIN_PASSWORD` — optional; logs in before capturing so protected routes render. Leave blank to skip.
   - `OPENAI_API_KEY` — optional; if blank, narration is skipped and a silent video is rendered.
   - `TTS_MODEL` / `TTS_VOICE` — OpenAI TTS model and voice (defaults `gpt-4o-mini-tts` / `alloy`).

3. **Run the web app** so screenshots can be captured:

   ```bash
   pnpm dev:web
   ```

## Authoring the guide

Edit `src/input/USER_GUIDE.md`. Every `## Heading` becomes one scene. Per-scene
overrides are supported via HTML comments:

```markdown
## Follow-ups
<!-- route: /followups -->
<!-- duration: 15 -->
Narration text spoken by the TTS voice for this scene.
```

- `route` — the app path to screenshot (defaults to `/<slugified-title>`).
- `duration` — scene length in seconds (defaults to auto-fit from narration length).

Frontmatter supports `defaultDurationSeconds` as the minimum scene length.

## Structure

```
packages/video-generator/
  src/
    input/USER_GUIDE.md     # edit this
    scripts/1..4-*.ts        # pipeline steps
    remotion/Root.tsx        # composition entry
    remotion/DemoVideo.tsx   # per-scene template
    lib/                     # paths, env, schema, markdown helpers
  public/                    # Remotion static assets (screenshots + audio)
  src/output/                # generated scenes.json + demo.mp4 (gitignored)
```
