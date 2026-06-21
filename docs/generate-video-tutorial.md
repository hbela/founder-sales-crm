
Goal:Build a powerful content-generation system: create/update the Markdown guide, regenerate screenshots, regenerate the video, and publish a new product demo in minutes.
I’ll outline a practical reusable pipeline we can add to each app: Markdown in, screenshots/audio/video out, 
with a small Node/Remotion toolchain.
Build it as a small reusable package:

```text
USER_GUIDE.md
→ scenes.json
→ screenshots
→ narration.mp3
→ Remotion video
→ demo.mp4
```

Use **Playwright** for screenshots, **OpenAI TTS** for narration, and **Remotion** for programmatic video rendering. Remotion supports reusable React video templates and Node rendering, Playwright supports scripted screenshots, and OpenAI has a TTS API for spoken narration. ([remotion.dev][1])

## Step 1 — Create a video package

Inside your monorepo:

```bash
mkdir packages/video-generator
cd packages/video-generator
pnpm init
pnpm add remotion @remotion/renderer @remotion/cli
pnpm add playwright openai gray-matter marked zod dotenv
pnpm add -D typescript tsx @types/node
```

## Step 2 — Suggested structure

```text
packages/video-generator/
  src/
    input/
      USER_GUIDE.md
    scripts/
      1-md-to-scenes.ts
      2-capture-screenshots.ts
      3-generate-voice.ts
      4-render-video.ts
    remotion/
      Root.tsx
      DemoVideo.tsx
    output/
      scenes.json
      screenshots/
      audio/
      demo.mp4
```

## Step 3 — Define a scene format

`scenes.json` should become the bridge between Markdown and video:

```json
[
  {
    "id": "dashboard",
    "title": "Dashboard",
    "route": "/dashboard",
    "narration": "The dashboard gives clinic staff a clear overview of appointments, providers, and recent activity.",
    "screenshot": "screenshots/dashboard.png",
    "durationSeconds": 12
  }
]
```

## Step 4 — Convert Markdown to scenes

Start simple: every `## Heading` becomes one scene.

```ts
// scripts/1-md-to-scenes.ts
import fs from "node:fs/promises";

const md = await fs.readFile("src/input/USER_GUIDE.md", "utf8");

const sections = md
  .split(/^## /gm)
  .slice(1)
  .map((section, index) => {
    const [titleLine, ...bodyLines] = section.split("\n");
    const title = titleLine.trim();

    return {
      id: title.toLowerCase().replaceAll(" ", "-"),
      title,
      route: `/${title.toLowerCase().replaceAll(" ", "-")}`,
      narration: bodyLines.join(" ").replace(/\s+/g, " ").slice(0, 500),
      screenshot: `screenshots/${index + 1}-${title.toLowerCase().replaceAll(" ", "-")}.png`,
      durationSeconds: 12
    };
  });

await fs.mkdir("src/output", { recursive: true });
await fs.writeFile("src/output/scenes.json", JSON.stringify(sections, null, 2));
```

Run:

```bash
pnpm tsx src/scripts/1-md-to-scenes.ts
```

## Step 5 — Capture screenshots with Playwright

```ts
// scripts/2-capture-screenshots.ts
import fs from "node:fs/promises";
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const scenes = JSON.parse(await fs.readFile("src/output/scenes.json", "utf8"));

await fs.mkdir("src/output/screenshots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 }
});

for (const scene of scenes) {
  await page.goto(`${APP_URL}${scene.route}`, { waitUntil: "networkidle" });

  await page.screenshot({
    path: `src/output/${scene.screenshot}`,
    fullPage: false
  });
}

await browser.close();
```

Run your app first:

```bash
pnpm dev:web
```

Then:

```bash
pnpm tsx src/scripts/2-capture-screenshots.ts
```

## Step 6 — Generate narration audio

```ts
// scripts/3-generate-voice.ts
import fs from "node:fs/promises";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const scenes = JSON.parse(await fs.readFile("src/output/scenes.json", "utf8"));

await fs.mkdir("src/output/audio", { recursive: true });

for (const scene of scenes) {
  const audio = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: scene.narration
  });

  const buffer = Buffer.from(await audio.arrayBuffer());
  await fs.writeFile(`src/output/audio/${scene.id}.mp3`, buffer);
}
```

## Step 7 — Create the Remotion template

```tsx
// remotion/Root.tsx
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="DemoVideo"
      component={DemoVideo}
      durationInFrames={3600}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

```tsx
// remotion/DemoVideo.tsx
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export function DemoVideo({ scenes = [] }: { scenes: any[] }) {
  const frame = useCurrentFrame();
  const fps = 30;

  let startFrame = 0;

  for (const scene of scenes) {
    const duration = scene.durationSeconds * fps;
    const endFrame = startFrame + duration;

    if (frame >= startFrame && frame < endFrame) {
      const localFrame = frame - startFrame;
      const scale = interpolate(localFrame, [0, duration], [1, 1.06]);

      return (
        <AbsoluteFill style={{ backgroundColor: "#eaf6ff" }}>
          <Img
            src={scene.screenshot}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${scale})`
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: 100,
              fontSize: 52,
              fontWeight: 700,
              background: "white",
              padding: "24px 36px",
              borderRadius: 24
            }}
          >
            {scene.title}
          </div>
        </AbsoluteFill>
      );
    }

    startFrame = endFrame;
  }

  return null;
}
```

## Step 8 — Render the video

First render the visual-only version. Audio can be added after this with FFmpeg.

```ts
// scripts/4-render-video.ts
import fs from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const scenes = JSON.parse(await fs.readFile("src/output/scenes.json", "utf8"));

const bundled = await bundle({
  entryPoint: "src/remotion/Root.tsx"
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "DemoVideo",
  inputProps: { scenes }
});

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: "src/output/demo.mp4",
  inputProps: { scenes }
});
```

Run:

```bash
pnpm tsx src/scripts/4-render-video.ts
```

## Step 9 — Add one command

`package.json`:

```json
{
  "scripts": {
    "video:scenes": "tsx src/scripts/1-md-to-scenes.ts",
    "video:screens": "tsx src/scripts/2-capture-screenshots.ts",
    "video:voice": "tsx src/scripts/3-generate-voice.ts",
    "video:render": "tsx src/scripts/4-render-video.ts",
    "video": "pnpm video:scenes && pnpm video:screens && pnpm video:voice && pnpm video:render"
  }
}
```

## Recommended MVP version

For the first version, skip perfect audio sync. Create:

```text
8–12 scenes
10–15 seconds each
2–3 minutes total
screenshot + title + narration
```

Then improve later with:

```text
subtitle generation
zoom-to-click areas
background music
animated cursor
Hungarian and English voice versions
YouTube Shorts format
```

This is the right reusable foundation for Sunshine Dental and your other apps.

[1]: https://www.remotion.dev/?utm_source=chatgpt.com "Remotion | Make videos programmatically"
