/** @jsxRuntime automatic */
/** @jsxImportSource react */
/**
 * Campaign send CLI. Renders a registered campaign and sends it via Resend.
 *
 *   pnpm --filter @founder-crm/emails send -- --campaign launch --dry
 *   pnpm --filter @founder-crm/emails send -- --campaign launch --subject "We're live" --to you@example.com
 *   pnpm --filter @founder-crm/emails send -- --campaign launch --subject "We're live" --list ./recipients.csv
 *
 * Always send a test to yourself first. Env (root .env): RESEND_API_KEY,
 * RESEND_FROM_EMAIL, REPLY_TO_EMAIL. With no key the send is simulated.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { renderEmail } from "../src/render.js";
import { campaigns } from "../src/campaigns.js";
import { sendViaResend, sendBatchViaResend, type ResendConfig, type SendResult } from "../src/transport.js";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../.env") });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

/** Parse a recipient list: .json (string[] | {email}[]) or one email per line. */
function parseList(path: string): string[] {
  const raw = readFileSync(path, "utf-8");
  if (path.endsWith(".json")) {
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map((r) => (typeof r === "string" ? r : (r as { email: string }).email)).filter(Boolean);
  }
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes("@"));
}

function summarize(label: string, results: SendResult[]): void {
  const ok = results.filter((r) => r.success).length;
  const simulated = results.some((r) => r.simulated);
  const failures = results.filter((r) => !r.success);
  console.log(`\n${label}: ${ok}/${results.length} sent${simulated ? " (simulated — no RESEND_API_KEY)" : ""}`);
  for (const f of failures.slice(0, 10)) console.error(`  ✖ ${f.error}`);
  if (failures.length) process.exitCode = 1;
}

async function main(): Promise<void> {
  const key = arg("campaign") ?? "launch";
  const factory = campaigns[key];
  if (!factory) fail(`Unknown campaign "${key}". Known: ${Object.keys(campaigns).join(", ")}`);

  const html = await renderEmail(factory());

  if (has("dry")) {
    console.log(`Campaign "${key}" rendered: ${html.length} bytes`);
    console.log(`Contains <video> tag: ${html.includes("<video")}`);
    console.log(`\n--- first 600 chars ---\n${html.slice(0, 600)}`);
    return;
  }

  const subject = arg("subject");
  if (!subject) fail("--subject is required to send (use --dry to just render)");

  const config: ResendConfig = {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: arg("from") ?? process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    replyTo: process.env.REPLY_TO_EMAIL || undefined,
  };

  const to = arg("to");
  const listPath = arg("list");
  if (!to && !listPath) fail("provide --to <email> (test) or --list <path> (campaign)");

  if (to) {
    const result = await sendViaResend(config, { to, subject, html });
    summarize(`Test → ${to}`, [result]);
    return;
  }

  const recipients = parseList(listPath!);
  if (!recipients.length) fail(`No recipients found in ${listPath}`);
  console.log(`Sending "${subject}" to ${recipients.length} recipients…`);
  const throttle = arg("throttle");
  const results = await sendBatchViaResend(
    config,
    recipients.map((r) => ({ to: r, subject, html })),
    throttle ? { throttleMs: Number(throttle) } : {},
  );
  summarize(`Campaign → ${recipients.length} recipients`, results);
}

void main();
