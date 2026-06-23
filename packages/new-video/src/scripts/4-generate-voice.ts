import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { loadEnv } from "../lib/env";
import {
  AUDIO_DIR,
  INTRO_NARRATION_PATH,
  OUTRO_NARRATION_PATH,
  SCENES_PATH,
} from "../lib/paths";
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

async function generateVoice(label: string, text: string, outPath: string): Promise<void> {
  if (!text) return;
  if (existsSync(outPath)) {
    console.log(`→ Skipping ${label} (already exists)`);
    skipped++;
    return;
  }
  try {
    console.log(`→ Generating voice for ${label}…`);
    const audio = await openai.audio.speech.create({ model, voice, input: text });
    const buffer = Buffer.from(await audio.arrayBuffer());
    await fs.writeFile(outPath, buffer);
    generated++;
  } catch (err) {
    console.warn(
      `⚠ Failed to generate voice for ${label}: ${err instanceof Error ? err.message : err}`,
    );
    failed++;
  }
}

// Intro narration.
if (existsSync(INTRO_NARRATION_PATH)) {
  const introText = (await fs.readFile(INTRO_NARRATION_PATH, "utf8")).trim();
  await generateVoice("intro", introText, path.join(AUDIO_DIR, "intro.mp3"));
}

// Per-scene narration.
for (const scene of scenes) {
  await generateVoice(scene.title, scene.narration, path.join(AUDIO_DIR, `${scene.id}.mp3`));
}

// Outro narration.
if (existsSync(OUTRO_NARRATION_PATH)) {
  const outroText = (await fs.readFile(OUTRO_NARRATION_PATH, "utf8")).trim();
  await generateVoice("outro", outroText, path.join(AUDIO_DIR, "outro.mp3"));
}

console.log(
  `✓ Generated ${generated}, skipped ${skipped} (already existed), failed ${failed} — ${AUDIO_DIR}`,
);
