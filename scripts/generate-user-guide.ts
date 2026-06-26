/**
 * Assembles docs/user-guide.md from the existing Stitch screen previews
 * (design/stitch/<name>.preview.png). The markdown is shaped for the portfolio's
 * "doc-theme" renderer: a leading H1 (hero title) + intro paragraph (hero
 * subtitle), then one H2 section per screen with a short description and a
 * screenshot reference.
 *
 * Image refs use the `assets/screenshots/<name>.png` convention; the portfolio
 * import API rewrites that prefix to `/<slug>/` and the companion
 * publish-user-guide.ts copies the PNGs into the portfolio's public/<slug>/.
 *
 * Run: pnpm guide:generate
 */
import { writeFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const stitchDir = join(repoRoot, "design", "stitch")
const outPath = join(repoRoot, "docs", "user-guide.md")

const HERO_TITLE = "Founder Sales CRM — User Guide"
const HERO_SUBTITLE =
  "A founder-first sales CRM that takes you from a cold contact to a closed deal: " +
  "import and enrich contacts, move them through a visual pipeline, and run AI-assisted " +
  "email outreach, campaigns, and follow-ups — all from one workspace."

/**
 * Ordered screens. `name` matches design/stitch/<name>.preview.png; `title`
 * becomes the H2 section heading; `body` is the section description.
 */
const screens: { name: string; title: string; body: string }[] = [
  {
    name: "login",
    title: "Signing In",
    body: "Sign in with your email and password to reach your workspace. Sessions are cookie-based, so you stay signed in across visits until you log out.",
  },
  {
    name: "dashboard",
    title: "Dashboard",
    body: "The dashboard is your daily starting point. It surfaces headline metrics — active contacts, pipeline value, campaigns in flight, and follow-ups due — so you can see what needs attention before diving into the detail.",
  },
  {
    name: "contacts",
    title: "Contacts",
    body: "The contacts list is the heart of the CRM. Search, filter, and sort every person you're working, and bulk-import leads from a CSV. Each row links straight through to a full contact profile.",
  },
  {
    name: "contact-detail",
    title: "Contact Detail",
    body: "Open a contact to see everything in one place: company and role, enrichment data, the emails you've exchanged, and where they sit in your pipeline. This is where you log activity and decide the next step.",
  },
  {
    name: "contact-form",
    title: "Adding & Editing Contacts",
    body: "Create a new contact or edit an existing one through a simple form covering name, company, role, email, and the supporting fields the CRM uses to personalise outreach.",
  },
  {
    name: "pipeline",
    title: "Pipeline",
    body: "The pipeline gives you a visual, stage-by-stage view of every deal. Drag contacts between stages as conversations progress, so the board always reflects the real state of your sales.",
  },
  {
    name: "campaigns",
    title: "Campaigns",
    body: "Campaigns let you send a designed email to a segment of contacts and track how it performs. Build the audience, pick a template, and launch — then watch opens and replies roll in.",
  },
  {
    name: "outreach",
    title: "Outreach",
    body: "The outreach view is built for one-to-one selling. Compose AI-assisted, personalised emails to individual contacts and send them without leaving the contact's context.",
  },
  {
    name: "templates",
    title: "Email Templates",
    body: "Save your best-performing emails as reusable templates. Templates keep your messaging consistent and make both campaigns and one-off outreach far faster to send.",
  },
  {
    name: "followups",
    title: "Follow-ups",
    body: "Never let a warm lead go cold. The follow-ups view collects every contact that's due for a nudge, so you can work through your reminders in one focused pass.",
  },
  {
    name: "products",
    title: "Products",
    body: "Manage the products and offers you sell. Keeping products defined here lets you attach the right offer to a contact, campaign, or deal.",
  },
]

function main() {
  const missing = screens
    .map((s) => s.name)
    .filter((name) => !existsSync(join(stitchDir, `${name}.preview.png`)))

  if (missing.length) {
    console.warn(
      `⚠️  Missing Stitch previews (sections still written): ${missing.join(", ")}`,
    )
  }

  const sections = screens
    .map(
      (s) =>
        `## ${s.title}\n\n${s.body}\n\n![${s.title}](assets/screenshots/${s.name}.png)`,
    )
    .join("\n\n")

  const md = `# ${HERO_TITLE}\n\n${HERO_SUBTITLE}\n\n${sections}\n`

  writeFileSync(outPath, md, "utf8")
  console.log(`✅ Wrote ${outPath} (${screens.length} sections)`)
}

main()
