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
  console.error("✖ scenes.json not found. Run `pnpm video:scenes` first.");
  process.exit(1);
}

const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));

await fs.mkdir(AUDIO_DIR, { recursive: true });

const openai = new OpenAI({ apiKey });

let generated = 0;
let skipped = 0;
let failed = 0;

for (const scene of scenes) {
  if (!scene.narration) continue;

  const outPath = path.join(AUDIO_DIR, `${scene.id}.mp3`);
  if (existsSync(outPath)) {
    console.log(`→ Skipping ${scene.title} (already exists)`);
    skipped++;
    continue;
  }

  try {
    console.log(`→ Generating voice for ${scene.title}…`);
    const audio = await openai.audio.speech.create({
      model,
      voice,
      input: scene.narration,
    });
    const buffer = Buffer.from(await audio.arrayBuffer());
    await fs.writeFile(outPath, buffer);
    generated++;
  } catch (err) {
    console.warn(
      `⚠ Failed to generate voice for ${scene.title}: ${err instanceof Error ? err.message : err}`,
    );
    failed++;
  }
}

console.log(
  `✓ Generated ${generated}, skipped ${skipped} (already existed), failed ${failed} — ${AUDIO_DIR}`,
);
