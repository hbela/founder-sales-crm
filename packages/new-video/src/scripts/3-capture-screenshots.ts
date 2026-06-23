import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { loadEnv } from "../lib/env";
import { PUBLIC_DIR, SCENES_PATH, SCREENSHOTS_DIR } from "../lib/paths";
import { scenesSchema } from "../lib/schema";

loadEnv();

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? "";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD ?? "";
const width = Number(process.env.VIEWPORT_WIDTH ?? 1920);
const height = Number(process.env.VIEWPORT_HEIGHT ?? 1080);

if (!existsSync(SCENES_PATH)) {
  console.error("✖ scenes.json not found. Run `pnpm video:scenes` first.");
  process.exit(1);
}

const scenes = scenesSchema.parse(JSON.parse(await fs.readFile(SCENES_PATH, "utf8")));

await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

try {
  const response = await fetch(APP_URL, { signal: AbortSignal.timeout(5000) });
  if (!response.ok && response.status >= 500) {
    throw new Error(`Received HTTP ${response.status}`);
  }
} catch (error) {
  console.error(`Unable to reach the web app at ${APP_URL}.`);
  console.error("Start it in another terminal with: corepack pnpm dev:web");
  console.error("If it runs on a different port, update APP_URL in packages/new-video/.env.");
  throw error;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });

try {
  if (LOGIN_EMAIL && LOGIN_PASSWORD) {
    console.log(`→ Logging in as ${LOGIN_EMAIL}…`);
    await page.goto(`${APP_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill(LOGIN_EMAIL);
    await page.locator("#password").fill(LOGIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  }

  for (const scene of scenes) {
    const url = `${APP_URL}${scene.route}`;
    console.log(`→ Capturing ${scene.title} (${url})`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const outPath = path.join(PUBLIC_DIR, scene.screenshot);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await page.screenshot({ path: outPath, fullPage: false });
  }
} finally {
  await browser.close();
}

console.log(`✓ Captured ${scenes.length} screenshots into ${SCREENSHOTS_DIR}`);
