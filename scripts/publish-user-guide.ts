/**
 * Pushes docs/user-guide.md to the portfolio (my-blog):
 *   1. Copies the referenced Stitch previews into the portfolio's
 *      public/<slug>/ directory (both repos are local; commit + redeploy the
 *      portfolio to ship the images in production).
 *   2. POSTs the manifest + markdown to the portfolio's import API, which
 *      upserts the Project row (the DB row updates immediately).
 *
 * Env (founder-sales-crm/.env):
 *   PORTFOLIO_API_URL       default http://localhost:3000
 *   PORTFOLIO_IMPORT_SECRET shared with my-blog's IMPORT_API_SECRET
 *   PORTFOLIO_PUBLIC_DIR    default ../my-blog/public
 *
 * Run: pnpm guide:publish
 */
import { readFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, isAbsolute, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")

// --- Minimal .env loader (no dotenv dependency at the repo root) ---
function loadEnv() {
  const envPath = join(repoRoot, ".env")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}
loadEnv()

const SLUG = "founder-sales-crm"
const API_URL = process.env.PORTFOLIO_API_URL || "http://localhost:3000"
const SECRET = process.env.PORTFOLIO_IMPORT_SECRET
const PUBLIC_DIR = process.env.PORTFOLIO_PUBLIC_DIR || "../my-blog/public"

const manifest = {
  slug: SLUG,
  title: "Founder Sales CRM",
  brandIcon: "F",
  docTheme: true,
  published: true,
  technologies: "React, Vite, TanStack Router, Fastify, Prisma, Tailwind CSS",
  excerpt:
    "A founder-first sales CRM: import and enrich contacts, move them through a visual pipeline, and run AI-assisted email outreach, campaigns, and follow-ups from one workspace.",
  image: `/${SLUG}/dashboard.png`,
}

async function main() {
  if (!SECRET) {
    throw new Error(
      "PORTFOLIO_IMPORT_SECRET is not set — add it to founder-sales-crm/.env (must match my-blog's IMPORT_API_SECRET).",
    )
  }

  const guidePath = join(repoRoot, "docs", "user-guide.md")
  if (!existsSync(guidePath)) {
    throw new Error(`Missing ${guidePath} — run \`pnpm guide:generate\` first.`)
  }
  const content = readFileSync(guidePath, "utf8")

  // Resolve target public dir (relative paths are relative to the repo root).
  const publicDir = isAbsolute(PUBLIC_DIR)
    ? PUBLIC_DIR
    : resolve(repoRoot, PUBLIC_DIR)
  const destDir = join(publicDir, SLUG)

  // 1. Copy each referenced Stitch preview into public/<slug>/.
  const referenced = new Set<string>()
  const re = /assets\/screenshots\/([\w-]+)\.png/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) referenced.add(m[1])

  if (referenced.size === 0) {
    console.warn("⚠️  No assets/screenshots/*.png references found in the guide.")
  } else {
    mkdirSync(destDir, { recursive: true })
    const stitchDir = join(repoRoot, "design", "stitch")
    const missing: string[] = []
    for (const name of referenced) {
      const src = join(stitchDir, `${name}.preview.png`)
      if (!existsSync(src)) {
        missing.push(name)
        continue
      }
      copyFileSync(src, join(destDir, `${name}.png`))
    }
    if (missing.length) {
      throw new Error(
        `Missing Stitch previews for: ${missing.join(", ")} (expected design/stitch/<name>.preview.png)`,
      )
    }
    console.log(`✅ Copied ${referenced.size} image(s) → ${destDir}`)
  }

  // 2. POST to the import API.
  const endpoint = `${API_URL.replace(/\/$/, "")}/api/projects/import`
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET}`,
    },
    body: JSON.stringify({ ...manifest, content }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Import API ${res.status}: ${text}`)
  }
  console.log(`✅ Published to ${endpoint}`)
  console.log(text)
}

main().catch((e) => {
  console.error(`❌ Publish failed: ${e.message ?? e}`)
  process.exitCode = 1
})
