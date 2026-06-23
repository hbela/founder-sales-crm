import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { loadEnv } from "../lib/env";
import {
  INTRO_NARRATION_PATH,
  OUTPUT_DIR,
  OUTRO_NARRATION_PATH,
  SCENES_PATH,
  SCRIPT_PATH,
} from "../lib/paths";
import { scenesSchema, scriptSchema, type Scene } from "../lib/schema";
import { slugify } from "../lib/text";

loadEnv();

if (!existsSync(SCRIPT_PATH)) {
  console.error("✖ script.json not found. Run `pnpm video:script` first.");
  process.exit(1);
}

const script = scriptSchema.parse(JSON.parse(await fs.readFile(SCRIPT_PATH, "utf8")));

await fs.mkdir(OUTPUT_DIR, { recursive: true });

// Write intro/outro narration for the TTS step.
await fs.writeFile(INTRO_NARRATION_PATH, script.hook.cleanNarration);
await fs.writeFile(OUTRO_NARRATION_PATH, script.cta.cleanNarration);

// Map feature sections to scenes.
const scenes: Scene[] = script.sections.map((section, index) => {
  const id = slugify(section.title) || `scene-${index + 1}`;
  return {
    id,
    title: section.title,
    route: section.route ?? `/${id}`,
    narration: section.cleanNarration,
    screenshot: `screenshots/${id}.png`,
    durationSeconds: section.durationSeconds,
  };
});

const parsed = scenesSchema.parse(scenes);

await fs.writeFile(SCENES_PATH, JSON.stringify(parsed, null, 2));

console.log(`✓ Wrote ${parsed.length} scenes to ${SCENES_PATH}`);
console.log(`  Intro narration → ${INTRO_NARRATION_PATH}`);
console.log(`  Outro narration → ${OUTRO_NARRATION_PATH}`);
for (const s of parsed) {
  console.log(`  - ${s.title}  ${s.route}  (${s.durationSeconds}s)`);
}
