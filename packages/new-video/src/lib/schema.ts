import { z } from "zod";

/** Frames per second used by the Remotion composition. */
export const FPS = 30;

/** Duration of the animated brand intro in frames (18 seconds at 30 fps). */
export const INTRO_DURATION_IN_FRAMES = 540;

/** Duration of the animated brand outro in frames (20 seconds at 30 fps). */
export const OUTRO_DURATION_IN_FRAMES = 600;

// ---------------------------------------------------------------------------
// Input: app context
// ---------------------------------------------------------------------------

export const appContextSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  techStack: z.string().min(1),
  pricing: z.string().min(1),
  description: z.string().min(1),
  brand: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    primaryColor: z.string().min(1),
    darkColor: z.string().min(1),
  }),
  features: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        route: z.string().startsWith("/"),
        techDetails: z.string().min(1),
      }),
    )
    .min(1),
});
export type AppContext = z.infer<typeof appContextSchema>;

// ---------------------------------------------------------------------------
// GLM-generated script
// ---------------------------------------------------------------------------

export const scriptSectionSchema = z.object({
  sectionType: z.enum(["hook", "feature", "cta"]),
  title: z.string().min(1),
  /** Narration with delivery directions like [ENERGY: 8/10], [PAUSE: 0.5s]. */
  narration: z.string(),
  /** Narration with delivery markers stripped — what the TTS engine speaks. */
  cleanNarration: z.string(),
  durationSeconds: z.number().positive(),
  /** App route to screenshot (feature sections only). */
  route: z.string().startsWith("/").optional(),
  visualCues: z.array(z.string()),
  emotionTarget: z.string(),
});
export type ScriptSection = z.infer<typeof scriptSectionSchema>;

export const scriptSchema = z.object({
  hook: scriptSectionSchema,
  sections: z.array(scriptSectionSchema),
  cta: scriptSectionSchema,
  audience: z.unknown().optional(),
  narrative: z.unknown().optional(),
});
export type Script = z.infer<typeof scriptSchema>;

// ---------------------------------------------------------------------------
// Scene (consumed by Remotion)
// ---------------------------------------------------------------------------

export const sceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  route: z.string().startsWith("/"),
  narration: z.string(),
  /** Path relative to the Remotion `public/` dir, e.g. `screenshots/dashboard.png`. */
  screenshot: z.string(),
  durationSeconds: z.number().positive(),
});
export type Scene = z.infer<typeof sceneSchema>;

export const scenesSchema = z.array(sceneSchema);
export type Scenes = z.infer<typeof scenesSchema>;

/** A scene enriched at render time with its narration audio path (or null). */
export type SceneWithAudio = Scene & { audio: string | null };
