/**
 * Sync the live ngrok URL into the n8n "Gmail Reply Sync" workflow.
 *
 * A free ngrok tunnel gets a new subdomain on every restart, which breaks the
 * n8n workflow that POSTs replies/opt-outs to the local CRM API. This script
 * reads ngrok's local API for the current public URL and patches the
 * `CRM_API_BASE_URL` constant in the workflow's code node via n8n's REST API.
 *
 *   pnpm --filter api sync:ngrok                  # detect + patch once
 *   pnpm --filter api sync:ngrok -- --dry         # detect + show change, don't write
 *   pnpm --filter api sync:ngrok -- --watch       # poll ngrok, auto-patch on change
 *   pnpm --filter api sync:ngrok -- --watch --interval 10
 *
 * Env (root .env):
 *   N8N_API_URL                 e.g. https://n8ndev.appointer.hu
 *   N8N_API_KEY                 n8n API key (Settings → API)
 *   N8N_REPLY_SYNC_WORKFLOW_ID  default: XJY0b9iwUrJ1AGeC
 *   N8N_REPLY_SYNC_NODE         default: "Extract Reply"
 *   PORT                        API port the tunnel must point at (default 4000)
 *   NGROK_API_URL               default: http://127.0.0.1:4040/api/tunnels
 *   NGROK_POLL_SECONDS          watch poll interval (default 5; --interval wins)
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../.env") });

const DRY = process.argv.includes("--dry");
const WATCH = process.argv.includes("--watch");

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const NGROK_API_URL = process.env.NGROK_API_URL ?? "http://127.0.0.1:4040/api/tunnels";
const API_PORT = process.env.PORT ?? "4000";
const N8N_API_URL = (process.env.N8N_API_URL ?? "").replace(/\/+$/, "");
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";
const WORKFLOW_ID = process.env.N8N_REPLY_SYNC_WORKFLOW_ID ?? "XJY0b9iwUrJ1AGeC";
const NODE_NAME = process.env.N8N_REPLY_SYNC_NODE ?? "Extract Reply";
const POLL_MS = Math.max(1, Number(argValue("interval") ?? process.env.NGROK_POLL_SECONDS ?? 5)) * 1000;

const URL_RE = /(const\s+CRM_API_BASE_URL\s*=\s*)'[^']*'/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toLocaleTimeString();

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

interface NgrokTunnel {
  public_url: string;
  proto: string;
  config?: { addr?: string };
}

/** Find the https tunnel pointing at the API port. Throws if ngrok/tunnel is absent. */
async function detectNgrokUrl(): Promise<string> {
  let res: Response;
  try {
    res = await fetch(NGROK_API_URL);
  } catch {
    throw new Error(`Could not reach ngrok at ${NGROK_API_URL}. Is ngrok running?`);
  }
  if (!res.ok) throw new Error(`ngrok API ${res.status} at ${NGROK_API_URL}`);

  const { tunnels = [] } = (await res.json()) as { tunnels?: NgrokTunnel[] };
  const match =
    tunnels.find((t) => t.proto === "https" && t.config?.addr?.includes(`:${API_PORT}`)) ??
    tunnels.find((t) => t.config?.addr?.includes(`:${API_PORT}`));

  if (!match) {
    const addrs = tunnels.map((t) => `${t.proto} → ${t.config?.addr}`).join(", ") || "(none)";
    throw new Error(`No ngrok tunnel for port ${API_PORT}. Active tunnels: ${addrs}`);
  }
  return match.public_url.trim();
}

interface Workflow {
  name: string;
  nodes: { name: string; parameters?: { jsCode?: string } }[];
  connections: unknown;
  settings?: unknown;
  active?: boolean;
}

function n8nHeaders(): Record<string, string> {
  return { "X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json", Accept: "application/json" };
}

async function getWorkflow(): Promise<Workflow> {
  const res = await fetch(`${N8N_API_URL}/api/v1/workflows/${WORKFLOW_ID}`, { headers: n8nHeaders() });
  if (!res.ok) throw new Error(`n8n GET workflow ${res.status}: ${await res.text()}`);
  return (await res.json()) as Workflow;
}

/** Patch the workflow's CRM_API_BASE_URL to `publicUrl` if it differs. */
async function syncOnce(publicUrl: string): Promise<"updated" | "unchanged" | "dry"> {
  const wf = await getWorkflow();
  const node = wf.nodes.find((n) => n.name === NODE_NAME);
  if (!node?.parameters?.jsCode) throw new Error(`Node "${NODE_NAME}" or its jsCode not found in workflow ${WORKFLOW_ID}`);
  if (!URL_RE.test(node.parameters.jsCode)) throw new Error(`Could not find CRM_API_BASE_URL assignment in node "${NODE_NAME}"`);

  const before = node.parameters.jsCode.match(/CRM_API_BASE_URL\s*=\s*'([^']*)'/)?.[1]?.trim();
  if (before === publicUrl) return "unchanged";

  console.log(`• ${before ?? "(unset)"}  →  ${publicUrl}`);
  if (DRY) return "dry";

  node.parameters.jsCode = node.parameters.jsCode.replace(URL_RE, `$1'${publicUrl}'`);

  // n8n's public API PUT only accepts name/nodes/connections/settings.
  const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings ?? {} };
  const put = await fetch(`${N8N_API_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: "PUT",
    headers: n8nHeaders(),
    body: JSON.stringify(payload),
  });
  if (!put.ok) throw new Error(`n8n PUT workflow ${put.status}: ${await put.text()}`);

  // PUT can drop the active state — re-activate if it was running.
  if (wf.active) {
    const act = await fetch(`${N8N_API_URL}/api/v1/workflows/${WORKFLOW_ID}/activate`, { method: "POST", headers: n8nHeaders() });
    if (!act.ok) console.warn(`! Updated, but re-activation failed (${act.status}). Activate it in n8n.`);
  }
  return "updated";
}

function requireConfig(): void {
  if (!N8N_API_URL || !N8N_API_KEY) {
    fail("Set N8N_API_URL and N8N_API_KEY in .env (Settings → API in n8n) to patch the workflow.");
  }
}

async function runOnce(): Promise<void> {
  let publicUrl: string;
  try {
    publicUrl = await detectNgrokUrl();
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
  console.log(`• ngrok (port ${API_PORT}) → ${publicUrl}`);
  requireConfig();

  const result = await syncOnce(publicUrl);
  if (result === "unchanged") console.log(`✓ Already up to date (${publicUrl}). No change.`);
  else if (result === "dry") console.log("Dry run — not writing to n8n.");
  else console.log(`✓ Patched → ${publicUrl}`);
}

async function runWatch(): Promise<void> {
  requireConfig();
  console.log(`👀 Watching ngrok (port ${API_PORT}) every ${POLL_MS / 1000}s — Ctrl+C to stop.${DRY ? " [dry]" : ""}`);
  let lastSynced: string | null = null;

  for (;;) {
    try {
      const publicUrl = await detectNgrokUrl();
      if (publicUrl !== lastSynced) {
        const result = await syncOnce(publicUrl);
        if (result === "updated") console.log(`[${ts()}] ✓ Patched → ${publicUrl}`);
        else if (result === "dry") console.log(`[${ts()}] (dry) would patch → ${publicUrl}`);
        else console.log(`[${ts()}] ✓ In sync (${publicUrl})`);
        lastSynced = publicUrl; // only advance after a successful pass
      }
    } catch (err) {
      // Tolerate transient outages (ngrok restarting, n8n briefly down) and retry.
      console.warn(`[${ts()}] … ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(POLL_MS);
  }
}

void (WATCH ? runWatch() : runOnce());
