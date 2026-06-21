import fs from "node:fs/promises";
import matter from "gray-matter";
import { loadEnv } from "../lib/env";
import {
  extractComment,
  slugify,
  stripHtmlComments,
  stripMarkdown,
} from "../lib/markdown";
import { OUTPUT_DIR, SCENES_PATH, USER_GUIDE_PATH } from "../lib/paths";
import { scenesSchema, type Scene } from "../lib/schema";

loadEnv();

const raw = await fs.readFile(USER_GUIDE_PATH, "utf8");
const { data, content } = matter(raw);
const defaultDuration = Number(data.defaultDurationSeconds ?? 12);

// Every `## Heading` becomes one scene.
const sections = content.split(/^## /gm).slice(1);

const scenes: Scene[] = sections.map((section, index) => {
  const newlineIdx = section.indexOf("\n");
  const title = (newlineIdx === -1 ? section : section.slice(0, newlineIdx)).trim();
  const body = newlineIdx === -1 ? "" : section.slice(newlineIdx + 1);

  const id = slugify(title) || `scene-${index + 1}`;
  const routeOverride = extractComment(body, "route");
  const durationOverride = extractComment(body, "duration");

  const narration = stripMarkdown(stripHtmlComments(body)).slice(0, 500);

  // Auto-fit duration to narration length (~15 chars/sec + 2s padding) so the
  // spoken audio always fits inside the scene, unless an explicit override is set.
  const fittedDuration = Math.ceil(narration.length / 15) + 2;

  return {
    id,
    title,
    route: routeOverride ?? `/${id}`,
    narration,
    screenshot: `screenshots/${id}.png`,
    durationSeconds: durationOverride
      ? Number(durationOverride)
      : Math.max(defaultDuration, fittedDuration),
  };
});

const parsed = scenesSchema.parse(scenes);

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.writeFile(SCENES_PATH, JSON.stringify(parsed, null, 2));

console.log(`✓ Wrote ${parsed.length} scenes to ${SCENES_PATH}`);
for (const s of parsed) {
  console.log(`  - ${s.title}  ${s.route}  (${s.durationSeconds}s)`);
}
