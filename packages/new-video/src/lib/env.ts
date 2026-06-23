import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { MONOREPO_ROOT, PKG_ROOT } from "./paths";

let loaded = false;

/**
 * Loads env vars from the monorepo root `.env` first, then this package's
 * `.env` (which takes precedence). Safe to call from every script.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const files = [path.join(MONOREPO_ROOT, ".env"), path.join(PKG_ROOT, ".env")];
  for (const file of files) {
    if (existsSync(file)) dotenv.config({ path: file, override: true });
  }
}
