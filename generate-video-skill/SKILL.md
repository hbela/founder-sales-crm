# Generate Video

A reusable content-generation pipeline: **Markdown in → screenshots + TTS narration → product demo video out.**

```
USER_GUIDE.md → scenes.json → screenshots → narration.mp3 → demo.mp4
```

## When to use

Invoke when the user wants to:
- Generate a product demo / walkthrough / tutorial video from a markdown guide.
- Capture screenshots of a running web app programmatically.
- Add spoken (TTS) narration to a video.
- Render a video with Remotion.
- Says `/generate-video`, "make a demo video", "generate a video tutorial", "scaffold a video generator".

Stack: **Playwright** (screenshots), **OpenAI TTS** (narration), **Remotion** (programmatic video render).

## What it builds

A `video-generator` package containing four `tsx` scripts chained by one command, plus a Remotion React template:

| Step | Script | Output |
| --- | --- | --- |
| 1. Markdown → scenes | `1-md-to-scenes.ts` | `scenes.json` |
| 2. Capture screenshots | `2-capture-screenshots.ts` | `public/screenshots/*.png` |
| 3. Generate narration | `3-generate-voice.ts` | `public/audio/*.mp3` |
| 4. Render video | `4-render-video.ts` | `demo.mp4` |
| 5. Studio (visual preview) | `5-studio-props.ts` + `remotion studio` | live UI at `localhost:3000` |

### Standard video structure (always use this ordering)

Every demo video follows the same five-part organization:

```
BrandIntro (18 s) → BrandHero (12 s) → screenshot scenes (from USER_GUIDE.md) → BrandOutro (20 s)
```

1. **BrandIntro** — animated home page: the app logo drops in with a spring
   bounce ("Logo Bounce Drop"), then the product name, tagline, and a short
   feature list (≈5 lines) fade in one by one. Narrated.
2. **BrandHero** — a full-bleed brand image with a slow Ken Burns zoom, a
   bottom gradient, and two animated caption lines. For a receptionist-style
   product this is a photo of a friendly receptionist on the phone
   (AI-generate it once via the OpenAI Images API and commit it). Narrated.
3. **Screenshot scenes** — one per `## Heading` in `USER_GUIDE.md`, framed as a
   16:9 rounded card on a branded gradient backdrop with a white title chip.
4. **BrandOutro** — thank-you page: logo fades in, then timed lines ("Thank
   you for watching." / product one-liner / contact CTA / like-and-subscribe)
   appear in sync with the narration, ending in a fade-out.

## Phase 1 — Detect the target environment (DO THIS FIRST)

Before writing any code, determine these from the target repo. State findings to the user.

1. **Monorepo or single app?**
   - `pnpm-workspace.yaml` / `package.json` workspaces → add as `packages/video-generator` with scope `@<org>/video-generator`.
   - Single app → add as `<app>/video-generator` or root `video-generator/`.
2. **Package manager + conventions**: pnpm/npm/yarn; ESM (`"type": "module"`); `tsx` for scripts; `tsc --noEmit` for typecheck; base tsconfig to extend.
3. **Web app URL + port**: Vite (5173), Next (3000), CRA (3000), etc. → default `APP_URL`.
4. **Routes to feature**: read the router (TanStack Router, React Router, Next app dir, etc.) and list real routes for the demo scenes.
5. **Auth (critical)**: are target routes protected?
   - If yes, find the login form: email field selector, password field selector, submit button text/role.
   - Confirm auth is cookie/session-based (Playwright persists cookies across pages automatically — no extra wiring needed). If token-in-localStorage, the screenshot script must inject it instead.
   - Find seeded/dev credentials (look for `db:seed`, `SEED_ADMIN_*` env, or a seed script).
6. **Tailwind/shadcn theming** (only if the app uses shadcn): check whether CSS vars hold full color values (`oklch(...)`/`hsl(...)` with no wrapper) — if so, `tailwind.config` must use bare `var(--x)`, not `hsl(var(--x))`. Fix before capturing so screenshots look right.

## Phase 2 — Scaffold the package

Create this structure (paths assume a monorepo `packages/video-generator`; for a single app, drop the `packages/` prefix or adjust):

```
video-generator/
  package.json
  tsconfig.json
  .env.example
  .gitignore
  README.md
  public/.gitkeep
  public/brand/logo.png          # committed (NOT gitignored): app logo, e.g. copied from the web app's pwa-512x512.png
  public/brand/<hero>.png        # committed: AI-generated hero image (e.g. receptionist on the phone)
  src/
    input/USER_GUIDE.md
    lib/paths.ts
    lib/env.ts
    lib/schema.ts
    lib/markdown.ts
    scripts/1-md-to-scenes.ts
    scripts/2-capture-screenshots.ts
    scripts/3-generate-voice.ts
    scripts/4-render-video.ts
    remotion/Root.tsx
    remotion/DemoVideo.tsx
    remotion/BrandLogo.tsx       # brand constants (colors, name, tagline, font stack)
    remotion/BrandIntro.tsx      # animated logo + feature-list home page
    remotion/BrandHero.tsx       # full-bleed hero image scene
    remotion/BrandOutro.tsx      # animated thank-you page
```

> `.gitignore` covers `public/screenshots/` and `public/audio/` only — keep
> `public/brand/` committed so the logo and hero image travel with the repo.

### package.json

Adjust `name` scope and package manager script syntax (pnpm shown). Deps: `remotion`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/cli`, `playwright`, `openai`, `gray-matter`, `marked`, `zod` (pin `4.3.6` exactly — Remotion 4 requires it), `dotenv`. DevDeps: `react`/`react-dom` (match the app's React major), `@types/react`, `@types/react-dom`, `@types/node`, `tsx`, `typescript`.

```json
{
  "name": "@<scope>/video-generator",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "video:scenes": "tsx src/scripts/1-md-to-scenes.ts",
    "video:screens": "tsx src/scripts/2-capture-screenshots.ts",
    "video:voice": "tsx src/scripts/3-generate-voice.ts",
    "video:render": "tsx src/scripts/4-render-video.ts",
    "video:browsers": "playwright install chromium",
    "video:studio": "tsx src/scripts/5-studio-props.ts && remotion studio src/remotion/Root.tsx --props src/output/studio-props.json --port 3000",
    "video": "pnpm video:scenes && pnpm video:screens && pnpm video:voice && pnpm video:render",
    "typecheck": "tsc --noEmit"
  }
}
```

### tsconfig.json

Extends the repo's base tsconfig. Because this package has JSX (Remotion), override to Bundler module resolution + `jsx: react-jsx` + DOM libs (mirror the web app's tsconfig). `noEmit: true`.

```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src"]
}
```

### .env.example

```env
APP_URL=http://localhost:5173
LOGIN_EMAIL=
LOGIN_PASSWORD=
OPENAI_API_KEY=
TTS_MODEL=gpt-4o-mini-tts
TTS_VOICE=alloy
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080
```

### .gitignore

```
.env
src/output/
public/screenshots/
public/audio/
```

### src/lib/paths.ts

Resolves all paths from the package root via `import.meta.url`. **Node-only** (never import from Remotion components).

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PKG_ROOT = path.resolve(__dirname, "../..");
export const MONOREPO_ROOT = path.resolve(PKG_ROOT, "../..");

export const INPUT_DIR = path.join(PKG_ROOT, "src/input");
export const USER_GUIDE_PATH = path.join(INPUT_DIR, "USER_GUIDE.md");

export const OUTPUT_DIR = path.join(PKG_ROOT, "src/output");
export const SCENES_PATH = path.join(OUTPUT_DIR, "scenes.json");
export const VIDEO_OUTPUT = path.join(OUTPUT_DIR, "demo.mp4");

export const PUBLIC_DIR = path.join(PKG_ROOT, "public");
export const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, "screenshots");
export const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");

export const REMOTION_ENTRY = path.join(PKG_ROOT, "src/remotion/Root.tsx");
```

> For a single-app layout (no `packages/`), set `MONOREPO_ROOT = PKG_ROOT` and adjust `../..` accordingly.

### src/lib/env.ts

Loads the monorepo root `.env` first, then the package `.env` (package wins). Safe to call from every script.

```ts
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { MONOREPO_ROOT, PKG_ROOT } from "./paths";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const files = [path.join(MONOREPO_ROOT, ".env"), path.join(PKG_ROOT, ".env")];
  for (const file of files) {
    if (existsSync(file)) dotenv.config({ path: file, override: true });
  }
}
```

### src/lib/schema.ts

**Browser-safe** (only zod) so Remotion components can import it. Defines `FPS`, `Scene`, `Scenes`, `SceneWithAudio`.

```ts
import { z } from "zod";

export const FPS = 30;

/** Animated brand intro: logo bounce + name + tagline + feature list (18 s). */
export const INTRO_DURATION_IN_FRAMES = 540;

/** Full-bleed hero image scene (12 s). */
export const HERO_DURATION_IN_FRAMES = 360;

/** Animated thank-you outro (20 s). */
export const OUTRO_DURATION_IN_FRAMES = 600;

/** Narration audio for the fixed (non-screenshot) scenes; null = silent. */
export type ExtraAudio = {
  intro: string | null;
  hero: string | null;
  outro: string | null;
};

export const sceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  route: z.string().startsWith("/"),
  narration: z.string(),
  screenshot: z.string(),
  durationSeconds: z.number().positive(),
});
export type Scene = z.infer<typeof sceneSchema>;

export const scenesSchema = z.array(sceneSchema);
export type Scenes = z.infer<typeof scenesSchema>;

export type SceneWithAudio = Scene & { audio: string | null };
```

### src/lib/markdown.ts

```ts
import { marked } from "marked";

export function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function extractComment(body: string, key: string): string | undefined {
  const re = new RegExp(`<!--\\s*${key}\\s*:\\s*(.+?)\\s*-->`, "i");
  return body.match(re)?.[1]?.trim();
}

export function stripHtmlComments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, "");
}

export function stripMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
```

### src/input/USER_GUIDE.md

**Adapt to the target app's real routes.** Every `## Heading` becomes one scene. Use `<!-- route: /path -->` when the slugified title doesn't match the actual route. Keep narration to ~120–160 chars so it auto-fits ~12s.

```markdown
---
title: <App Name> — Product Demo
defaultDurationSeconds: 12
---

# <App Name>

One-line description of the app.

## <Feature 1>
<!-- route: /<actual-route> -->
Spoken narration for this scene. Keep it concise and benefit-focused.

## <Feature 2>
<!-- route: /<actual-route> -->
Narration for the next scene.
```

### src/scripts/1-md-to-scenes.ts

Splits on `^## `, builds scenes, auto-fits duration to narration length (~15 chars/sec + 2s pad), validates with zod.

```ts
import fs from "node:fs/promises";
import matter from "gray-matter";
import { loadEnv } from "../lib/env";
import { extractComment, slugify, stripHtmlComments, stripMarkdown } from "../lib/markdown";
import { OUTPUT_DIR, SCENES_PATH, USER_GUIDE_PATH } from "../lib/paths";
import { scenesSchema, type Scene } from "../lib/schema";

loadEnv();

const raw = await fs.readFile(USER_GUIDE_PATH, "utf8");
const { data, content } = matter(raw);
const defaultDuration = Number(data.defaultDurationSeconds ?? 12);

const sections = content.split(/^## /gm).slice(1);

const scenes: Scene[] = sections.map((section, index) => {
  const newlineIdx = section.indexOf("\n");
  const title = (newlineIdx === -1 ? section : section.slice(0, newlineIdx)).trim();
  const body = newlineIdx === -1 ? "" : section.slice(newlineIdx + 1);

  const id = slugify(title) || `scene-${index + 1}`;
  const routeOverride = extractComment(body, "route");
  const durationOverride = extractComment(body, "duration");
  const narration = stripMarkdown(stripHtmlComments(body)).slice(0, 500);
  const fittedDuration = Math.ceil(narration.length / 15) + 2;

  return {
    id,
    title,
    route: routeOverride ?? `/${id}`,
    narration,
    screenshot: `screenshots/${id}.png`,
    durationSeconds: durationOverride ? Number(durationOverride) : Math.max(defaultDuration, fittedDuration),
  };
});

const parsed = scenesSchema.parse(scenes);
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.writeFile(SCENES_PATH, JSON.stringify(parsed, null, 2));

console.log(`✓ Wrote ${parsed.length} scenes to ${SCENES_PATH}`);
for (const s of parsed) console.log(`  - ${s.title}  ${s.route}  (${s.durationSeconds}s)`);
```

### src/scripts/2-capture-screenshots.ts

**Adapt the login selectors** (marked `<<< ADAPT >>>`) to the target app's login form found in Phase 1. Uses `domcontentloaded` + wait (NOT `networkidle`).

```ts
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { loadEnv } from "../lib/env";
import { PUBLIC_DIR, SCENES_PATH, SCREENSHOTS_DIR } from "../lib/paths";
import { scenesSchema } from "../lib/schema";

loadEnv();

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? "";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD ?? "";
const width = Number(process.env.VIEWPORT_WIDTH ?? 1920);
const height = Number(process.env.VIEWPORT_HEIGHT ?? 1080);

if (!existsSync(SCENES_PATH)) {
  console.error("✖ scenes.json not found. Run `video:scenes` first.");
  process.exit(1);
}

const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });

try {
  if (LOGIN_EMAIL && LOGIN_PASSWORD) {
    console.log(`→ Logging in as ${LOGIN_EMAIL}…`);
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    // <<< ADAPT: selectors for the target app's login form >>>
    await page.locator("#email").fill(LOGIN_EMAIL);
    await page.locator("#password").fill(LOGIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    // <<< ADAPT: the post-login URL to wait for >>>
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  }

  for (const scene of scenes) {
    const url = `${APP_URL}${scene.route}`;
    console.log(`→ Capturing ${scene.title} (${url})`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const outPath = path.join(PUBLIC_DIR, scene.screenshot);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath, fullPage: false });
  }
} finally {
  await browser.close();
}

console.log(`✓ Captured ${scenes.length} screenshots into ${SCREENSHOTS_DIR}`);
```

> **Token-in-localStorage auth?** Replace the login block with `await page.addInitScript(...)` or `await page.evaluate(() => localStorage.setItem("token", ...))` before navigating.

### src/scripts/3-generate-voice.ts

Skips existing tracks (re-runs only fill gaps). Exits 0 with no API key so the pipeline still renders a silent video.

**Also generates the brand-scene tracks**: define an `EXTRA_TRACKS: Record<string, string>`
map with `intro` / `hero` / `outro` narration texts (write them to fit the
`*_DURATION_IN_FRAMES` constants: intro ≈ 45–50 words, hero ≈ 30, outro ≈ 50),
and iterate `[...extraTracks, ...scenes]` through the same skip-if-exists TTS
loop so `audio/intro.mp3`, `audio/hero.mp3`, `audio/outro.mp3` are produced
alongside the scene narrations.

```ts
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { loadEnv } from "../lib/env";
import { AUDIO_DIR, SCENES_PATH } from "../lib/paths";
import { scenesSchema } from "../lib/schema";

loadEnv();

const apiKey = process.env.OPENAI_API_KEY ?? "";
const model = process.env.TTS_MODEL ?? "gpt-4o-mini-tts";
const voice = process.env.TTS_VOICE ?? "alloy";

if (!apiKey) {
  console.warn("⚠ OPENAI_API_KEY not set — skipping narration generation.");
  process.exit(0);
}
if (!existsSync(SCENES_PATH)) {
  console.error("✖ scenes.json not found. Run `video:scenes` first.");
  process.exit(1);
}

const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));
await fs.mkdir(AUDIO_DIR, { recursive: true });
const openai = new OpenAI({ apiKey });

let generated = 0, skipped = 0, failed = 0;
for (const scene of scenes) {
  if (!scene.narration) continue;
  const outPath = path.join(AUDIO_DIR, `${scene.id}.mp3`);
  if (existsSync(outPath)) { console.log(`→ Skipping ${scene.title} (already exists)`); skipped++; continue; }
  try {
    console.log(`→ Generating voice for ${scene.title}…`);
    const audio = await openai.audio.speech.create({ model, voice, input: scene.narration });
    await fs.writeFile(outPath, Buffer.from(await audio.arrayBuffer()));
    generated++;
  } catch (err) {
    console.warn(`⚠ Failed for ${scene.title}: ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}
console.log(`✓ Generated ${generated}, skipped ${skipped}, failed ${failed} — ${AUDIO_DIR}`);
```

### src/scripts/4-render-video.ts

Bundles the Remotion entry with `publicDir`, enriches scenes with audio paths (only if files exist), renders h264 mp4.

**inputProps must include `extraAudio`**: build it with an `audioIfExists(id)`
helper (`existsSync(path.join(AUDIO_DIR, `${id}.mp3`)) ? `audio/${id}.mp3` : null`)
for `intro` / `hero` / `outro`, and pass `{ scenes: scenesWithAudio, extraAudio }`.
The same applies to `5-studio-props.ts` — the Studio props file must carry
`extraAudio` too, or the brand scenes preview silent.

```ts
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { loadEnv } from "../lib/env";
import { AUDIO_DIR, OUTPUT_DIR, PUBLIC_DIR, REMOTION_ENTRY, SCENES_PATH, VIDEO_OUTPUT } from "../lib/paths";
import { scenesSchema, type SceneWithAudio } from "../lib/schema";

loadEnv();

if (!existsSync(SCENES_PATH)) {
  console.error("✖ scenes.json not found. Run `video:scenes` first.");
  process.exit(1);
}
const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));

const missing = scenes.filter((s) => !existsSync(path.join(PUBLIC_DIR, s.screenshot)));
if (missing.length > 0) {
  console.error(`✖ Missing screenshots: ${missing.map((m) => m.screenshot).join(", ")}`);
  process.exit(1);
}

const scenesWithAudio: SceneWithAudio[] = scenes.map((scene) => ({
  ...scene,
  audio: existsSync(path.join(AUDIO_DIR, `${scene.id}.mp3`)) ? `audio/${scene.id}.mp3` : null,
}));

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PUBLIC_DIR, { recursive: true });

console.log("→ Bundling Remotion entry point…");
const serveUrl = await bundle({ entryPoint: REMOTION_ENTRY, publicDir: PUBLIC_DIR });

console.log("→ Selecting composition…");
const inputProps = { scenes: scenesWithAudio };
const composition = await selectComposition({ serveUrl, id: "DemoVideo", inputProps });

console.log("→ Rendering video…");
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: VIDEO_OUTPUT, inputProps });

console.log(`✓ Rendered video to ${VIDEO_OUTPUT}`);
```

### src/remotion/Root.tsx

**MUST call `registerRoot()`.** Dynamic duration via `calculateMetadata` — intro + hero + scenes + outro.

```tsx
import { Composition, registerRoot } from "remotion";
import { DemoVideo } from "./DemoVideo";
import {
  FPS, HERO_DURATION_IN_FRAMES, INTRO_DURATION_IN_FRAMES, OUTRO_DURATION_IN_FRAMES,
  type ExtraAudio, type SceneWithAudio,
} from "../lib/schema";

export const RemotionRoot = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={1}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        scenes: [] as SceneWithAudio[],
        extraAudio: { intro: null, hero: null, outro: null } as ExtraAudio,
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          1,
          INTRO_DURATION_IN_FRAMES + HERO_DURATION_IN_FRAMES +
            props.scenes.reduce((sum, s) => sum + Math.round(s.durationSeconds * FPS), 0) +
            OUTRO_DURATION_IN_FRAMES,
        ),
      })}
    />
  );
};

registerRoot(RemotionRoot);
```

### src/remotion/DemoVideo.tsx

Lays out the standard structure: intro → hero → one `<Sequence>` per scene (scopes audio) → outro. Screenshot scenes render as a 16:9 rounded card on a branded gradient with a Ken Burns zoom and a white title chip.

```tsx
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  FPS, HERO_DURATION_IN_FRAMES, INTRO_DURATION_IN_FRAMES, OUTRO_DURATION_IN_FRAMES,
  type ExtraAudio, type SceneWithAudio,
} from "../lib/schema";
import { BrandHero } from "./BrandHero";
import { BrandIntro } from "./BrandIntro";
import { BrandOutro } from "./BrandOutro";
import { BRAND_BG, BRAND_DARK, BRAND_PRIMARY, FONT_STACK } from "./BrandLogo";

const NO_EXTRA_AUDIO: ExtraAudio = { intro: null, hero: null, outro: null };

export function DemoVideo({
  scenes = [],
  extraAudio = NO_EXTRA_AUDIO,
}: { scenes: SceneWithAudio[]; extraAudio?: ExtraAudio }) {
  let offset = INTRO_DURATION_IN_FRAMES + HERO_DURATION_IN_FRAMES;
  const segments = scenes.map((scene) => {
    const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * FPS));
    const from = offset;
    offset += durationInFrames;
    return { scene, from, durationInFrames };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND_BG }}>
      <Sequence from={0} durationInFrames={INTRO_DURATION_IN_FRAMES}>
        <BrandIntro audio={extraAudio.intro} />
      </Sequence>
      <Sequence from={INTRO_DURATION_IN_FRAMES} durationInFrames={HERO_DURATION_IN_FRAMES}>
        <BrandHero audio={extraAudio.hero} />
      </Sequence>
      {segments.map(({ scene, from, durationInFrames }) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
          <SceneFrame scene={scene} durationInFrames={durationInFrames} />
        </Sequence>
      ))}
      <Sequence from={offset} durationInFrames={OUTRO_DURATION_IN_FRAMES}>
        <BrandOutro audio={extraAudio.outro} />
      </Sequence>
    </AbsoluteFill>
  );
}

function SceneFrame({ scene, durationInFrames }: { scene: SceneWithAudio; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_PRIMARY} 100%)`,
        padding: "72px 96px", display: "flex", justifyContent: "center", alignItems: "center",
      }}
    >
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
      <div
        style={{
          position: "relative", height: "100%", maxWidth: "100%", aspectRatio: "16 / 9",
          borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 90px rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Img src={staticFile(scene.screenshot)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
        <div style={{ position: "absolute", bottom: 32, left: 40, fontSize: 48, fontWeight: 700, fontFamily: FONT_STACK, color: BRAND_DARK, background: "white", padding: "20px 32px", borderRadius: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
          {scene.title}
        </div>
      </div>
    </AbsoluteFill>
  );
}
```

### src/remotion/BrandLogo.tsx, BrandIntro.tsx, BrandHero.tsx, BrandOutro.tsx

Copy these from the Sunshine Dental reference implementation and re-brand:

- **BrandLogo.tsx** — exports `BRAND_PRIMARY`, `BRAND_DARK`, `BRAND_BG`,
  `BRAND_NAME`, `BRAND_TAGLINE`, `FONT_STACK`, all derived from the target
  app's CSS variables. Every other brand component imports from here, so
  re-branding a new app is a one-file change.
- **BrandIntro.tsx** — spring "Logo Bounce Drop" (`spring({ damping: 8, stiffness: 120, mass: 0.8 })`
  driving `translateY` from −500, plus a squash-stretch spring), then name,
  tagline, and ≈5 feature lines staggered ~15 frames apart from frame 75.
  Uses `staticFile("brand/logo.png")` and takes `audio: string | null`.
- **BrandHero.tsx** — full-bleed `staticFile("brand/<hero>.png")` with a slow
  zoom (1 → 1.08), a `linear-gradient(to top, …)` scrim, and two caption
  lines fading in (~frames 30 and 70). Takes `audio: string | null`.
- **BrandOutro.tsx** — logo fade-in, then a `LINES` array of
  `{ text, start, size, weight }` items appearing in sync with the outro
  narration; fade-out over the last 25 frames. Takes `audio: string | null`.

**Audio-as-prop, not hardcoded**: each brand component renders
`{audio ? <Audio src={staticFile(audio)} /> : null}` and the render/studio
scripts pass `extraAudio` built with `existsSync` checks — this keeps the
"no API key → silent render" guarantee working for the brand scenes too.

### README.md

Document the pipeline table, setup (browser install, env, run the app), authoring guide (headings + `<!-- route -->` / `<!-- duration -->` overrides), structure, and the Studio section. See the verified `packages/video-generator/README.md` in the Founder Sales CRM repo as the reference.

### src/scripts/5-studio-props.ts

Generates a props file (enriched scenes + audio paths) for the Remotion Studio. The Studio can't read `scenes.json` directly — it needs `{ scenes: SceneWithAudio[] }` with resolved audio paths.

```ts
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "../lib/env";
import { AUDIO_DIR, OUTPUT_DIR, PUBLIC_DIR, SCENES_PATH } from "../lib/paths";
import { scenesSchema, type SceneWithAudio } from "../lib/schema";

loadEnv();

if (!existsSync(SCENES_PATH)) {
  console.error("✖ scenes.json not found. Run `video:scenes` first.");
  process.exit(1);
}

const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));

const missing = scenes.filter((s) => !existsSync(path.join(PUBLIC_DIR, s.screenshot)));
if (missing.length > 0) {
  console.warn(
    `⚠ Missing screenshots: ${missing.map((m) => m.screenshot).join(", ")} — Studio will show broken images. Run \`pnpm video:screens\`.`,
  );
}

const scenesWithAudio: SceneWithAudio[] = scenes.map((scene) => ({
  ...scene,
  audio: existsSync(path.join(AUDIO_DIR, `${scene.id}.mp3`)) ? `audio/${scene.id}.mp3` : null,
}));

await fs.mkdir(OUTPUT_DIR, { recursive: true });
const propsPath = path.join(OUTPUT_DIR, "studio-props.json");
await fs.writeFile(propsPath, JSON.stringify({ scenes: scenesWithAudio }, null, 2));

console.log(`✓ Wrote Studio props to ${propsPath}`);
console.log(`  ${scenesWithAudio.length} scenes, ${scenesWithAudio.filter((s) => s.audio).length} with audio`);
```

### Wire root scripts

If a monorepo, add to the root `package.json` `scripts`:

```json
"video": "pnpm --filter @<scope>/video-generator video",
"video:scenes": "pnpm --filter @<scope>/video-generator video:scenes",
"video:screens": "pnpm --filter @<scope>/video-generator video:screens",
"video:voice": "pnpm --filter @<scope>/video-generator video:voice",
"video:render": "pnpm --filter @<scope>/video-generator video:render",
"video:studio": "pnpm --filter @<scope>/video-generator video:studio",
"video:browsers": "pnpm --filter @<scope>/video-generator video:browsers"
```

## Phase 3 — Verify

1. `pnpm install` (or equivalent). Expect React peer-dep warnings from Remotion — non-fatal.
2. `pnpm typecheck` — must pass (JSX + Node scripts).
3. `pnpm video:scenes` — needs no external services; should write `scenes.json` and log scenes. This confirms the Markdown→scenes step end-to-end.
4. `pnpm video:browsers` — installs Chromium for Playwright.
5. Full E2E (requires running web app + DB + optional `OPENAI_API_KEY`): `pnpm video` → `demo.mp4`. Without an API key it renders a silent video. Protected routes need `LOGIN_EMAIL`/`LOGIN_PASSWORD` set to a seeded user.
6. `pnpm video:studio` — launches the Remotion Studio visual preview at `localhost:3000` (after `video:scenes` has run). Confirms the template renders with real props. Verify it stays up (doesn't disconnect) — if it does, check the zod version is pinned to 4.3.6.

## Critical gotchas (apply all of these)

These were all hit and fixed during the reference implementation — do NOT skip:

- **`registerRoot()`**: the Remotion entry file MUST call `registerRoot(RemotionRoot)`. Defining the component alone makes `bundle()` throw "does not contain registerRoot".
- **`public/` + `staticFile()`**: screenshots and audio MUST live under the bundle's `publicDir` and be referenced via `staticFile("screenshots/x.png")`. Putting them in `src/output/` or using raw `src={path}` silently fails to resolve.
- **`<Audio>` for narration**: embed narration via Remotion's `<Audio src={staticFile(...)}>` so the render produces a narrated video in one pass — no separate FFmpeg step.
- **No `networkidle`**: for screenshots use `domcontentloaded` + a short `waitForTimeout`. Vite/Next HMR websockets keep `networkidle` from ever settling → the script hangs.
- **Dynamic duration**: compute `durationInFrames` in `calculateMetadata` from scene durations, not a hardcoded constant.
- **`<Sequence>` per scene**: use `<Sequence from durationInFrames>` for layout (correctly scopes per-scene audio), not a per-frame `for`/`return` loop.
- **Auto-fit duration**: size each scene to its narration length (~15 chars/sec + 2s pad) so spoken audio always fits; overridable via `<!-- duration: N -->`.
- **Optional scripted login**: protected routes need a login step before capturing. Cookie/session auth works automatically (Playwright keeps cookies). Adapt selectors to the target app.
- **TTS skip-if-exists + no-key exit 0**: re-runs only fill missing tracks; with no API key, exit 0 so the `video` chain continues to a silent render.
- **Install `@remotion/bundler`**: the render script imports it — it's not pulled in transitively.
- **Install `@remotion/cli`**: needed for the Studio command (`remotion studio`).
- **Studio port conflict**: `remotion studio` reads the `PORT` env var, which in many apps is already taken (e.g. an API server on 4000). Always pass `--port 3000` (or another free port) explicitly to avoid "port not available" errors.
- **Studio needs a props file**: the Studio can't read `scenes.json` directly — generate `{ scenes: SceneWithAudio[] }` (with resolved audio paths) via a helper script and pass it with `--props <path>`. Otherwise the Studio shows an empty composition.
- **TTS length vs scene length**: audio is hard-cut at its `<Sequence>` boundary. After generating the brand tracks, probe the mp3 durations (ffmpeg) and make sure each fits its `*_DURATION_IN_FRAMES` constant with ~1 s to spare — TTS speaking rate varies, so word-count estimates alone are not enough. Bump the constant (animations key off it) rather than trimming the narration.
- **zod version**: Remotion 4 requires zod 4.3.6 — pin it exactly (`"zod": "4.3.6"`, no `^`). The openai SDK declares zod 3 as a peer dep, but the warning is non-fatal and TTS works fine with zod 4. Do NOT use zod 3 — it causes the Remotion Studio to crash/disconnect at runtime (React context breaks).
- **shadcn/oklch theming** (when capturing a shadcn app): if CSS vars hold full color values, `tailwind.config` colors must be bare `var(--x)`, not `hsl(var(--x))`, or the theme won't render in screenshots.

## Multi-language videos (optional)

If the target app is multilingual, make the pipeline language-aware from the
start (see the Sunshine Dental reference for a working implementation):

- `VIDEO_LANG` env var selects the language (default `en`). Make `loadEnv()`
  restore shell-set vars after reading `.env` files so `VIDEO_LANG=hu pnpm video`
  works without editing `.env` (snapshot `process.env` before dotenv, reassign after).
- Guide file per language: `USER_GUIDE.md` (en) / `USER_GUIDE.<lang>.md`.
- Per-language asset dirs: `screenshots/<lang>/…`, `audio/<lang>/…`, output
  `demo-<lang>.mp4` — so languages never clobber each other.
- Capture forces the app's UI language (e.g. pre-seeded localStorage key).
- All brand-scene copy (tagline, features, hero captions, outro lines) lives in
  a browser-safe `lib/brand-text.ts` keyed by language; components take a
  `lang` prop passed through inputProps.
- **Brand-scene durations must be per-language** (`introSeconds` etc. in
  `brand-text.ts`): TTS pacing differs a lot by language (Hungarian ran ~40%
  longer than English for the same content) and audio is hard-cut at the
  Sequence boundary. `calculateMetadata` reads them from `brandText(props.lang)`.
- Auto-fit scene duration at ~13 chars/sec + 2 s (15 chars/sec fits English but
  clips slower languages).
- `slugify` must strip accents (NFD normalize + drop combining marks) so
  localized headings make clean file names.

## Brand assets

- **Logo**: copy the target app's existing icon (e.g. `public/pwa-512x512.png`)
  to `public/brand/logo.png` — don't redraw it.
- **Hero image**: AI-generate once and commit to `public/brand/`. Use the
  OpenAI Images API (`gpt-image-1.5`, size `1536x1024`) with a narrative
  5-part prompt (image type → subject → environment → technical specs →
  constraints), e.g. a photorealistic receptionist on the phone in the brand's
  color world, ending with "No text, no watermarks, no logos".
- Keep `public/brand/` OUT of `.gitignore` (only `public/screenshots/` and
  `public/audio/` are generated artifacts).

## Reference implementation

Working, verified implementations live at `packages/video-generator/` in:

- **Sunshine Dental** (`C:\devs\prods\sunshine-dental`) — the most complete
  reference: full intro → hero → scenes → outro structure with prop-driven
  brand-scene audio (`ExtraAudio`), committed `public/brand/` assets, an
  `EXTRA_TRACKS` TTS map, and a capture-script preflight that verifies
  `${APP_URL}/api/health` really is the target API before shooting.
- **Founder Sales CRM** (`C:\devs\prods\founder-sales-crm`) — the original
  implementation (intro/outro hardcode their audio paths; prefer the
  prop-driven variant above for new apps).
