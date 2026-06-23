import type { ScriptSection } from "../lib/schema";

/**
 * Stage 4 — Polish & Optimize.
 *
 * Reviews all generated sections for consistency, pacing, flow, and curiosity
 * gap continuity. Returns the final polished script. Adapted from the guide's
 * `_polish_script` stage.
 */
export function buildPolishPrompt(
  sections: ScriptSection[],
  audience: unknown,
): string {
  return `You are a master video editor and script doctor. Polish and optimize this demo video script.

AUDIENCE PROFILE:
${JSON.stringify(audience, null, 2)}

CURRENT SCRIPT SECTIONS (in order):
${JSON.stringify(sections, null, 2)}

YOUR TASK:
Review and polish each section for:

1. CONSISTENCY: Ensure tone, energy, and terminology are consistent across all sections.
2. PACING: Ensure smooth transitions between sections. No jarring jumps.
3. CURIOSITY CONTINUITY: Each section should end with a hook into the next.
4. REDUNDANCY: Remove any repeated points or phrases across sections.
5. FLOW: The overall arc should build: hook → problem → solution → proof → CTA.
6. TTS READINESS: Ensure cleanNarration is natural spoken English (no markdown, no brackets).

RULES:
- Keep each section's sectionType, title, and route unchanged.
- You may adjust narration, cleanNarration, durationSeconds, visualCues, and emotionTarget.
- cleanNarration MUST be the narration with all [BRACKETS] removed.
- Do not add new sections. Do not remove sections.
- Keep durations realistic for the narration length (~15 chars/sec + 2s padding).

OUTPUT the full polished script as JSON:
{
  "hook": { ...polished hook section... },
  "sections": [ ...polished feature sections... ],
  "cta": { ...polished cta section... }
}`;
}
