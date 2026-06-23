import type { AppContext } from "../lib/schema";

/**
 * Stage 2 — Narrative Architecture with Hook Science.
 *
 * Designs the story arc using the "Curiosity Bridge" framework from the GLM
 * prompt engineering guide: every section ends with an unanswered question
 * that the next section answers, creating a "completion compulsion".
 */
export function buildNarrativePrompt(
  app: AppContext,
  audience: unknown,
): string {
  return `You are a YouTube script writer with 90%+ retention rates on SaaS demo videos.

APP: ${JSON.stringify(app, null, 2)}
AUDIENCE: ${JSON.stringify(audience, null, 2)}

DESIGN A NARRATIVE ARC following the "Curiosity Bridge" framework:

THE CURIOSITY BRIDGE PRINCIPLE:
Every section must end with an unanswered question that the next section answers.
This creates a "completion compulsion" that kills the back button.

STRUCTURE REQUIREMENTS:

1. THE HOOK (First 8 seconds - CRITICAL)
Options for hook types:
- "The Villain Hook": Name the pain they're suffering from
- "The Contrarian Hook": Challenge a belief they hold
- "The Number Hook": Specific, surprising stat
- "The Story Hook": Mini-narrative that creates empathy
- "The Visual Hook": Describe a dramatic before/after

Choose the BEST hook type for this audience. Then write 5 variations.
For each, calculate the "curiosity gap" - how badly they need to know more (1-10).

2. THE CRESCENDO PATTERN
Structure the middle sections to alternate between:
- Problem Amplification (make pain worse)
- Solution Glimpse (show light at end of tunnel)
- Pattern Interrupt (unexpected insight)
- Social Proof Embed (subtle validation)

Each section must be 30-45 seconds.
The emotional intensity must INCREASE with each cycle.

3. THE OBJECTION DESTRUCTION ZONE
Identify the top 3 objections each persona will have.
Address them BEFORE they consciously form.
Use the pattern: "Now you might be thinking... [objection], and you'd be right if...
[acknowledgment], but here's what's different... [reframe]"

4. THE COMMITMENT LADDER
Design a micro-commitment progression:
- Lurk phase: "This looks interesting"
- Curiosity phase: "How does that work?"
- Desire phase: "I want this capability"
- Belief phase: "This could work for us"
- Action phase: "Let me try this"

Each section should move viewers up one rung.

OUTPUT FORMAT:
{
  "hook": {
    "chosen_type": "hook type name",
    "variations": [
      {
        "script": "exact words",
        "curiosity_gap_score": 8,
        "visual_accompaniment": "what to show on screen",
        "emotional_hook": "what feeling it targets"
      }
    ]
  },
  "crescendo_cycles": [
    {
      "cycle_number": 1,
      "problem_amplification": {
        "script": "...",
        "pain_intensity": 1-10,
        "visual_metaphor": "..."
      },
      "solution_glimpse": {
        "script": "...",
        "aha_moment_trigger": "..."
      },
      "pattern_interrupt": {
        "script": "...",
        "cognitive_dissonance_created": "..."
      }
    }
  ],
  "objection_destruction": [
    {
      "objection": "What they're thinking",
      "acknowledgment": "Validating their concern",
      "reframe": "How this is different",
      "visual_proof": "What to show as evidence"
    }
  ],
  "commitment_ladder": [
    {
      "rung": "curiosity/desire/belief/action",
      "trigger_script": "...",
      "transition_to_next": "..."
    }
  ]
}`;
}
