# @founder-crm/new-video

GLM 5.2 AI script generation → screenshots + narration → product demo video out.

```
app-context.json → GLM 5.2 (4-stage script gen) → script.json
  → scenes.json → screenshots → narration.mp3 → Remotion → demo.mp4
```

Unlike `@founder-crm/video-generator` (which uses hand-written markdown for
narration), this package uses **GLM 5.2** to generate a professional video
script automatically — audience personas, narrative arc (Curiosity Bridge),
hook science, feature→benefit chains, and CTA conversion psychology — then
feeds it through the same Playwright → TTS → Remotion pipeline.

## Pipeline

| Step | Command | Output |
| --- | --- | --- |
| 1. GLM script generation | `pnpm video:script` | `src/output/script.json` |
| 2. Script → scenes | `pnpm video:scenes` | `src/output/scenes.json` |
| 3. Capture screenshots | `pnpm video:screens` | `public/screenshots/*.png` |
| 4. Generate narration | `pnpm video:voice` | `public/audio/*.mp3` |
| 5. Render video | `pnpm video:render` | `src/output/demo.mp4` |

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

Opens the Remotion Studio at `http://localhost:3001` (port 3001 avoids a
conflict with `video-generator`'s Studio on port 3000).

## GLM 5.2 Script Generation

The script is generated in 4 stages, each calling GLM 5.2 with a carefully
engineered prompt:

1. **Audience Analysis** — Generates 3 detailed viewer personas (pain points,
   viewing psychology, technical sophistication, decision-making factors).
2. **Narrative Architecture** — Designs the story arc using the "Curiosity
   Bridge" framework: hook variations, crescendo cycles, objection destruction,
   commitment ladder.
3. **Section Generation** — Generates the hook (first 8 seconds), per-feature
   sections (using the "5 Why's" reverse chain: feature → benefit → deeper
   benefit → human need → life transformation), and CTA (behavioral economics:
   reciprocity → loss aversion → social proof → zero-risk → specific ask).
4. **Polish & Optimize** — Reviews all sections for consistency, pacing, flow,
   and curiosity gap continuity.

Intermediate results (`audience.json`, `narrative.json`) are saved to
`src/output/` for transparency and debugging.

## Setup

1. **Install dependencies** (from monorepo root):

   ```bash
   pnpm install
   ```

2. **Install Playwright's browser** (one-time):

   ```bash
   pnpm new-video:browsers
   ```

3. **Configure env.** Copy `.env.example` → `.env` (or put keys in the monorepo root `.env`):

   - `GLM_API_KEY` — Z.ai API key for GLM 5.2 (get one at https://z.ai/model-api).
   - `GLM_MODEL` — model name (default `glm-5.2`; verify from Z.ai dashboard).
   - `GLM_BASE_URL` — API base URL (default `https://api.z.ai/api/paas/v4/`).
   - `OPENAI_API_KEY` — optional; if blank, narration is skipped and a silent video is rendered.
   - `TTS_MODEL` / `TTS_VOICE` — OpenAI TTS model and voice (defaults `gpt-4o-mini-tts` / `alloy`).
   - `APP_URL` — the running web app to screenshot (default `http://localhost:5173`).
   - `LOGIN_EMAIL` / `LOGIN_PASSWORD` — optional; logs in before capturing so protected routes render.

4. **Edit the input.** Customize `src/input/app-context.json` with your product
   info — name, category, tech stack, pricing, brand, and features (each with a
   route to screenshot).

5. **Run the web app** so screenshots can be captured:

   ```bash
   pnpm dev:web
   ```

## Authoring the app context

Edit `src/input/app-context.json`. Each feature becomes one scene in the video.
GLM 5.2 generates the narration for each feature based on its name, description,
and tech details.

```json
{
  "name": "Your Product",
  "category": "Category",
  "techStack": "React, Node, PostgreSQL",
  "pricing": "Free + Pro $29/mo",
  "description": "One-line description",
  "brand": {
    "name": "Brand Name",
    "tagline": "Tagline",
    "primaryColor": "#0047AB",
    "darkColor": "#0A1931"
  },
  "features": [
    {
      "name": "Feature Name",
      "description": "What it does",
      "route": "/feature-route",
      "techDetails": "Implementation details"
    }
  ]
}
```

## Structure

```
packages/new-video/
  src/
    input/app-context.json   # edit this — product info + features
    prompts/                  # GLM 5.2 prompt engineering (4 stages)
    scripts/1..6-*.ts         # pipeline steps
    remotion/Root.tsx         # composition entry
    remotion/DemoVideo.tsx    # per-scene template
    lib/                      # paths, env, schema, GLM client, text utils
  public/                     # Remotion static assets (screenshots + audio)
  src/output/                 # generated script.json, scenes.json, demo.mp4 (gitignored)
```

> **Note:** This package pins `zod@4.3.6` (the version Remotion requires). The
> Z.ai API is OpenAI-compatible, so the `openai` SDK is reused with a custom
> base URL — no separate GLM SDK needed.
