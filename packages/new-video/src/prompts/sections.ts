import type { AppContext, ScriptSection } from "../lib/schema";

export interface Narrative {
  hook?: { chosen_type?: string };
  crescendo_cycles?: unknown[];
  objection_destruction?: unknown[];
}

/**
 * Stage 3a — Hook section (first 8 seconds).
 *
 * Generates the critical opening using pattern interrupts, vocal energy
 * directions, and subconscious triggers. Adapted from the guide's
 * `_generate_hook_section` prompt.
 */
export function buildHookPrompt(app: AppContext, narrative: Narrative): string {
  return `Write THE FIRST 8 SECONDS of a YouTube video script.

CONTEXT:
Product: ${app.name} — ${app.description}
Category: ${app.category}
Selected hook type: ${narrative.hook?.chosen_type ?? "The Villain Hook"}

WRITING CONSTRAINTS:

1. FIRST SENTENCE RULES:
- No greetings ("Hey guys", "Welcome back")
- No channel introductions
- No "In this video..."
- Start MID-THOUGHT as if continuing a conversation
- Use pattern interrupts like:
  * "The reason most founders..."
  * "Here's something nobody tells you about..."
  * "In 2026, we finally figured out..."

2. VOCAL ENERGY DIRECTIONS:
Add [ENERGY: 8/10] markers to indicate intensity
Add [PAUSE: 0.5s] for dramatic beats
Add [SLOW DOWN] and [SPEED UP] for pacing

3. SUBCONSCIOUS TRIGGERS:
Embed these psychological triggers:
- Pattern interrupt (surprise their expectations)
- Specificity (exact numbers, not "many" or "lots")
- Relatability ("You know that feeling when...")
- Novelty ("There's a new approach that...")

4. THE CUT TEST:
If someone cut the video after your first sentence,
would they NEED to come back to hear the rest?
Score your sentence 1-10 on the "Completion Need" scale.

OUTPUT:
{
  "sectionType": "hook",
  "title": "Hook",
  "narration": "exact words with delivery directions",
  "cleanNarration": "the same words with all [BRACKETS] removed — plain text for TTS",
  "durationSeconds": 8,
  "visualCues": ["frame 1: visual description", "frame 2: visual description"],
  "emotionTarget": "confusion → curiosity → need to know"
}`;
}

/**
 * Stage 3b — Feature section.
 *
 * Translates a technical feature into a compelling narrative using the
 * "5 Why's" reverse chain (feature → benefit → deeper benefit → human need
 * → life transformation). Adapted from the guide's `_generate_feature_section`.
 */
export function buildFeaturePrompt(
  app: AppContext,
  feature: AppContext["features"][number],
  cycleIndex: number,
  narrative: Narrative,
): string {
  return `Transform this technical feature into a compelling video section.

PRODUCT: ${app.name} — ${app.description}

TECHNICAL FEATURE:
Name: ${feature.name}
What it does: ${feature.description}
Stack: ${feature.techDetails}
Route to screenshot: ${feature.route}

NARRATIVE CYCLE ${cycleIndex + 1} to follow:
${JSON.stringify(narrative.crescendo_cycles?.[cycleIndex] ?? {}, null, 2)}

USE THE "5 WHY'S" TECHNIQUE IN REVERSE:
Feature → Immediate Benefit → Deeper Benefit → Core Human Need → Life Transformation

Example:
Feature: Auto-generated API docs
→ Benefit 1: Save time writing docs
→ Benefit 2: Always up-to-date documentation
→ Benefit 3: Faster developer onboarding
→ Core Need: Feeling competent and efficient
→ Life Transformation: Go home at 5pm instead of 8pm

WRITING REQUIREMENTS:

1. SHOW DON'T TELL:
Don't: "Our contacts list is comprehensive"
Do: "Watch what happens when I search for a lead... [visual shows instant filtering]...
That's 3 minutes of scrolling that just happened in 0.3 seconds."

2. OBJECTION PREEMPTING:
Predict the skepticism and address it:
"Now, you might be thinking 'this looks like every other CRM'...
And you'd be right about most tools... but watch this [show unique feature]"

3. TECHNICAL CREDIBILITY MARKERS:
Sprinkle these authenticity signals:
- Mention specific technical challenges you solved
- Reference the actual tech stack (${app.techStack})
- Show real data being handled
- Admit a limitation (then show how you worked around it)

4. THE ANALOGY REQUIREMENT:
Create at least one analogy that:
- Makes complex tech feel simple
- Creates a memorable mental model
- Is visual in nature (can be animated)

Keep the narration between 30-45 seconds when spoken aloud.

OUTPUT:
{
  "sectionType": "feature",
  "title": "${feature.name}",
  "narration": "Full narration with delivery markers like [ENERGY: 7/10] and [PAUSE: 1s]",
  "cleanNarration": "the same narration with all [BRACKETS] removed — plain text for TTS",
  "durationSeconds": 35,
  "route": "${feature.route}",
  "visualCues": ["what to show on screen", "animation suggestions"],
  "emotionTarget": "skepticism → impressed → excited to try"
}`;
}

/**
 * Stage 3c — CTA section.
 *
 * Generates the call-to-action using behavioral economics principles
 * (reciprocity → loss aversion → social proof → zero-risk → specific ask).
 * Adapted from the guide's `_generate_cta_section`.
 */
export function buildCtaPrompt(app: AppContext, narrative: Narrative): string {
  return `Write a video outro/CTA following behavioral economics principles.

PRODUCT: ${app.name} — ${app.description}
Pricing: ${app.pricing}

APPLY THESE PRINCIPLES IN ORDER:

1. RECIPROCITY (First)
Give them something valuable BEFORE asking anything:
- A summary insight they can use right now
- A mental model they'll remember
- A specific tip unrelated to the product

2. LOSS AVERSION (Second)
Frame NOT using the product as a loss:
"Every day without ${app.name} is hours of manual pipeline tracking"
Use specific numbers and timeframes

3. SOCIAL PROOF (Third)
Embed proof naturally:
- "Founders using this are closing deals X% faster"
- "Teams who switched report fewer missed follow-ups"

4. ZERO-RISK FRAMING (Fourth)
Remove all perceived risk:
- Time risk: "Takes 2 minutes to try"
- Career risk: "Built for founders, by founders"
- Technical risk: "Works with your existing tools"

5. THE SPECIFIC ASK (Fifth)
One clear action, not multiple CTAs:
Bad: "Like, subscribe, comment, check the link, follow us..."
Good: "Here's what to do next: [one specific action]"

Keep the narration around 20 seconds when spoken aloud.

OUTPUT:
{
  "sectionType": "cta",
  "title": "Call to Action",
  "narration": "Full narration with delivery markers like [ENERGY: 6/10]",
  "cleanNarration": "the same narration with all [BRACKETS] removed — plain text for TTS",
  "durationSeconds": 20,
  "visualCues": ["what to show on screen"],
  "emotionTarget": "informed → motivated → ready to act"
}`;
}

export type { ScriptSection };
