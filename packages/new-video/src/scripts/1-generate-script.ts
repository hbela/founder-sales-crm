import fs from "node:fs/promises";
import { loadEnv } from "../lib/env";
import {
  APP_CONTEXT_PATH,
  AUDIENCE_PATH,
  NARRATIVE_PATH,
  OUTPUT_DIR,
  SCRIPT_PATH,
} from "../lib/paths";
import { glmJson } from "../lib/glm";
import {
  appContextSchema,
  scriptSchema,
  type AppContext,
  type Script,
  type ScriptSection,
} from "../lib/schema";
import { buildAudiencePrompt } from "../prompts/audience";
import { buildNarrativePrompt } from "../prompts/narrative";
import { buildCtaPrompt, buildFeaturePrompt, buildHookPrompt, type Narrative } from "../prompts/sections";
import { buildPolishPrompt } from "../prompts/polish";

loadEnv();

const raw = await fs.readFile(APP_CONTEXT_PATH, "utf8");
const app = appContextSchema.parse(JSON.parse(raw));

await fs.mkdir(OUTPUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Stage 1: Audience Analysis
// ---------------------------------------------------------------------------
console.log("→ Stage 1: Analyzing audience personas…");
const audience = await glmJson(buildAudiencePrompt(app), { temperature: 0.8 });
await fs.writeFile(AUDIENCE_PATH, JSON.stringify(audience, null, 2));
console.log(`  ✓ Wrote audience analysis to ${AUDIENCE_PATH}`);

// ---------------------------------------------------------------------------
// Stage 2: Narrative Architecture
// ---------------------------------------------------------------------------
console.log("→ Stage 2: Designing narrative arc…");
const narrative = await glmJson<Narrative>(buildNarrativePrompt(app, audience), {
  temperature: 0.9,
  maxTokens: 8192,
});
await fs.writeFile(NARRATIVE_PATH, JSON.stringify(narrative, null, 2));
console.log(`  ✓ Wrote narrative arc to ${NARRATIVE_PATH}`);

// ---------------------------------------------------------------------------
// Stage 3: Section-by-Section Generation
// ---------------------------------------------------------------------------
console.log("→ Stage 3: Generating script sections…");

const hook = await glmJson<ScriptSection>(buildHookPrompt(app, narrative), {
  temperature: 0.7,
  maxTokens: 8192,
});

const sections: ScriptSection[] = [];
for (let i = 0; i < app.features.length; i++) {
  const feature = app.features[i]!;
  console.log(`  → Feature ${i + 1}/${app.features.length}: ${feature.name}`);
  const section = await glmJson<ScriptSection>(
    buildFeaturePrompt(app, feature, i, narrative),
    { temperature: 0.6, maxTokens: 8192 },
  );
  sections.push(section);
}

const cta = await glmJson<ScriptSection>(buildCtaPrompt(app, narrative), {
  temperature: 0.7,
  maxTokens: 8192,
});

// ---------------------------------------------------------------------------
// Stage 4: Polish & Optimize
// ---------------------------------------------------------------------------
console.log("→ Stage 4: Polishing script…");
const allSections = [hook, ...sections, cta];
const polished = await glmJson<Script>(
  buildPolishPrompt(allSections, audience),
  { temperature: 0.4, maxTokens: 16384 },
);

polished.audience = audience;
polished.narrative = narrative;

const script = scriptSchema.parse(polished);

await fs.writeFile(SCRIPT_PATH, JSON.stringify(script, null, 2));

console.log(`✓ Wrote script to ${SCRIPT_PATH}`);
console.log(`  Hook: ${script.hook.title} (${script.hook.durationSeconds}s)`);
for (const s of script.sections) {
  console.log(`  Feature: ${s.title} (${s.durationSeconds}s) — ${s.route}`);
}
console.log(`  CTA: ${script.cta.title} (${script.cta.durationSeconds}s)`);
