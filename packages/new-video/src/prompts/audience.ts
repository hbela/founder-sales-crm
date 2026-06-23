import type { AppContext } from "../lib/schema";

/**
 * Stage 1 — Audience Persona Prompting.
 *
 * Generates 3 detailed viewer personas with pain points, viewing psychology,
 * technical sophistication, and decision-making factors. Adapted from the
 * "Audience Persona Prompting" section of the GLM 5.2 prompt engineering guide.
 */
export function buildAudiencePrompt(app: AppContext): string {
  return `You are a world-class marketing strategist and YouTube analytics expert.

CONTEXT:
Product: ${app.name}
Category: ${app.category}
Tech Stack: ${app.techStack}
Pricing: ${app.pricing}
Description: ${app.description}

TASK:
Create 3 detailed viewer personas who would watch a demo video of this product.
For each persona, analyze:

1. PAIN POINTS
- What specific problems made them search for this video?
- What have they tried before that failed?
- What's their "last straw" moment?

2. VIEWING PSYCHOLOGY
- What validation signals do they need?
- What would make them click away in the first 10 seconds?
- What proof would convince them this is different?

3. TECHNICAL SOPHISTICATION
- How much jargon can you use without losing them?
- What comparisons will resonate with their experience?
- What implementation concerns do they have?

4. DECISION-MAKING FACTORS
- What's their approval process?
- What objections will they face from their team?
- What ROI metrics matter to them?

FORMAT THE RESPONSE as structured JSON:
{
  "personas": [
    {
      "name": "Role descriptive name",
      "job_title": "Specific title",
      "company_stage": "startup/mid-market/enterprise",
      "primary_goal": "Their north star metric",
      "trigger_event": "What made them search now",
      "technical_level": 1-10,
      "attention_span": "short/medium/long",
      "decision_power": "evaluator/approver/influencer",
      "veto_concerns": ["concern1", "concern2"],
      "competitor_fatigue": "What they're tired of hearing",
      "secret_desire": "What they really want but won't say"
    }
  ],
  "viewing_context": {
    "likely_platform": "desktop/mobile/tablet",
    "viewing_situation": "researching/commuting/deep work",
    "next_action": "What they'll do after watching",
    "competition_for_attention": "What else is in their feed"
  }
}

Make the personas painfully specific. Generic personas produce generic scripts.`;
}
