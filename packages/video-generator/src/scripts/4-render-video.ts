import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { loadEnv } from "../lib/env";
import {
  AUDIO_DIR,
  OUTPUT_DIR,
  PUBLIC_DIR,
  REMOTION_ENTRY,
  SCENES_PATH,
  VIDEO_OUTPUT,
} from "../lib/paths";
import { scenesSchema, type SceneWithAudio } from "../lib/schema";

loadEnv();

if (!existsSync(SCENES_PATH)) {
  console.error("✖ scenes.json not found. Run `pnpm video:scenes` first.");
  process.exit(1);
}

const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));

const missing = scenes.filter((s) => !existsSync(path.join(PUBLIC_DIR, s.screenshot)));
if (missing.length > 0) {
  console.error(`✖ Missing screenshots: ${missing.map((m) => m.screenshot).join(", ")}`);
  console.error("  Run `pnpm video:screens` first.");
  process.exit(1);
}

// Audio is optional: only attach narration tracks that actually exist.
const scenesWithAudio: SceneWithAudio[] = scenes.map((scene) => ({
  ...scene,
  audio: existsSync(path.join(AUDIO_DIR, `${scene.id}.mp3`))
    ? `audio/${scene.id}.mp3`
    : null,
}));

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PUBLIC_DIR, { recursive: true });

console.log("→ Bundling Remotion entry point…");
const serveUrl = await bundle({
  entryPoint: REMOTION_ENTRY,
  publicDir: PUBLIC_DIR,
});

console.log("→ Selecting composition…");
const inputProps = { scenes: scenesWithAudio };
const composition = await selectComposition({
  serveUrl,
  id: "DemoVideo",
  inputProps,
});

console.log("→ Rendering video…");
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: VIDEO_OUTPUT,
  inputProps,
});

console.log(`✓ Rendered video to ${VIDEO_OUTPUT}`);
