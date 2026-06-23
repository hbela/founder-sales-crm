import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PKG_ROOT = path.resolve(__dirname, "../..");
export const MONOREPO_ROOT = path.resolve(PKG_ROOT, "../..");

export const INPUT_DIR = path.join(PKG_ROOT, "src/input");
export const APP_CONTEXT_PATH = path.join(INPUT_DIR, "app-context.json");

export const OUTPUT_DIR = path.join(PKG_ROOT, "src/output");
export const SCRIPT_PATH = path.join(OUTPUT_DIR, "script.json");
export const AUDIENCE_PATH = path.join(OUTPUT_DIR, "audience.json");
export const NARRATIVE_PATH = path.join(OUTPUT_DIR, "narrative.json");
export const SCENES_PATH = path.join(OUTPUT_DIR, "scenes.json");
export const VIDEO_OUTPUT = path.join(OUTPUT_DIR, "demo.mp4");
export const INTRO_NARRATION_PATH = path.join(OUTPUT_DIR, "intro-narration.txt");
export const OUTRO_NARRATION_PATH = path.join(OUTPUT_DIR, "outro-narration.txt");

export const PUBLIC_DIR = path.join(PKG_ROOT, "public");
export const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, "screenshots");
export const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");

export const REMOTION_ENTRY = path.join(PKG_ROOT, "src/remotion/Root.tsx");
