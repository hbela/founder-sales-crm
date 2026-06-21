import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PKG_ROOT = path.resolve(__dirname, "../..");
export const MONOREPO_ROOT = path.resolve(PKG_ROOT, "../..");

export const INPUT_DIR = path.join(PKG_ROOT, "src/input");
export const USER_GUIDE_PATH = path.join(INPUT_DIR, "USER_GUIDE.md");

export const OUTPUT_DIR = path.join(PKG_ROOT, "src/output");
export const SCENES_PATH = path.join(OUTPUT_DIR, "scenes.json");
export const VIDEO_OUTPUT = path.join(OUTPUT_DIR, "demo.mp4");

export const PUBLIC_DIR = path.join(PKG_ROOT, "public");
export const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, "screenshots");
export const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");

export const REMOTION_ENTRY = path.join(PKG_ROOT, "src/remotion/Root.tsx");
