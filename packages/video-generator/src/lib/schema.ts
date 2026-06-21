import { z } from "zod";

/** Frames per second used by the Remotion composition. */
export const FPS = 30;

/** Duration of the animated brand intro in frames (18 seconds at 30 fps). */
export const INTRO_DURATION_IN_FRAMES = 540;

/** Duration of the animated brand outro in frames (20 seconds at 30 fps). */
export const OUTRO_DURATION_IN_FRAMES = 600;

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
