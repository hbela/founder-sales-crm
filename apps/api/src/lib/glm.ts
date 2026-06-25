import OpenAI from "openai";
import { env } from "../env.js";

/**
 * GLM 5.2 client. The Z.ai API is OpenAI-compatible, so we reuse the `openai`
 * SDK with a custom base URL. Get an API key at https://z.ai/model-api.
 * Ported from packages/new-video/src/lib/glm.ts.
 */
export const glm = new OpenAI({
  apiKey: env.glmApiKey,
  baseURL: env.glmBaseUrl,
});

export function isGlmConfigured(): boolean {
  return Boolean(env.glmApiKey);
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

/** Calls GLM 5.2 with a prompt and parses the JSON response. */
export async function glmJson<T>(
  prompt: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  if (!env.glmApiKey) {
    throw new Error("GLM_API_KEY not set. Add it to .env (see .env.example).");
  }

  const attempts = 3;
  let lastError: unknown;
  const initialMaxTokens = opts?.maxTokens ?? 4096;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const maxTokens = Math.min(initialMaxTokens * attempt, 32768);
    const response = await glm.chat.completions.create({
      model: env.glmModel,
      messages: [{ role: "user", content: prompt }],
      temperature: attempt === 1 ? opts?.temperature ?? 0.8 : 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const choice = response.choices[0];
    const text = choice?.message?.content ?? "";

    if (text.trim().length === 0) {
      lastError = new Error(
        `GLM returned an empty response (finish_reason: ${choice?.finish_reason ?? "unknown"}, max_tokens: ${maxTokens}).`,
      );
      continue;
    }

    try {
      return JSON.parse(extractJson(text)) as T;
    } catch (error) {
      const preview = text.slice(0, 500).replace(/\s+/g, " ");
      lastError = new Error(
        `GLM returned invalid JSON (finish_reason: ${choice?.finish_reason ?? "unknown"}, max_tokens: ${maxTokens}). Response preview: ${preview}`,
        { cause: error },
      );
    }
  }

  throw lastError;
}
