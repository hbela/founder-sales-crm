# Redesign CRM GUIs via Stitch — MCP-Driven Workflow

## Context

The goal is to redesign the `apps/web` GUIs in Google Stitch. The open question was whether to drive
it through the Stitch MCP or start in the Stitch web app. Key clarification: **the MCP and the web
app act on the same Stitch projects** — they are two drivers, not two workflows. The decision is
*who drives iteration* and *whether Stitch is anchored to the existing design system*.

The app already has a coherent design system — OKLCH tokens with full light/dark themes in
[index.css](../apps/web/src/index.css), fonts (Alan Sans / Playfair Display / DM Mono), and
shadcn-style Radix components in [apps/web/src/components/ui/](../apps/web/src/components/ui/).
Discarding that would create avoidable integration rework.

**Chosen approach:** MCP-driven, anchored to the existing design system, validated on one pilot
screen (Dashboard) before scaling to the rest.

## Why MCP-driven (vs web-first)

- **Reproducible & in-editor** — the whole pipeline (seed design system → generate → edit → pull
  assets → port to React) runs via `mcp__stitch__*` tools, no context-switching.
- **Anchored to brand** — Stitch is seeded with a `design.md` built from the real tokens, so
  generated screens come back on-brand and port into existing shadcn components with minimal
  reconciliation.
- The web app stays available for occasional manual visual tweaks — same project, openable anytime.

## Workflow (pilot: Dashboard)

Driver skill: invoke the **`stitch-ui-design`** skill (and **`stitch-loop`** for iterative
generation), which wrap the MCP tool sequence below.

1. **Build the Stitch design.md from existing tokens.** Translate the `:root` + `.dark` OKLCH
   variables, fonts, radius (`0.75rem`), and shadow scale from
   [index.css](../apps/web/src/index.css) into a Stitch `design.md`. Save it under a new
   `design/stitch/design.md`.
   - Tools: `mcp__stitch__upload_design_md` → `mcp__stitch__create_design_system_from_design_md`
     (or `create_design_system` + `update_design_system`).

2. **Create the Stitch project and apply the design system.**
   - Tools: `mcp__stitch__create_project` → `mcp__stitch__apply_design_system`.

3. **Generate the Dashboard screen from a structured text prompt** describing the existing layout so
   the redesign is a refinement, not a re-invention. Source of truth for layout/content:
   [Dashboard.tsx](../apps/web/src/features/dashboard/Dashboard.tsx) and the app shell
   [AppLayout.tsx](../apps/web/src/components/layout/AppLayout.tsx) (left sidebar nav, top header).
   Prompt should specify: 8 stat cards (Total Contacts, Emails Sent, Replies, Meetings Booked,
   Customers, Reply Rate, Conversion Rate, Active Campaigns), "Follow-ups Due Today" card, "Recent
   Replies" list, and "Pipeline Overview" status grid.
   - Tools: `mcp__stitch__generate_screen_from_text`.

4. **Iterate.** Review render, refine layout/spacing/visual hierarchy.
   - Tools: `mcp__stitch__get_screen`, `mcp__stitch__edit_screens`,
     `mcp__stitch__generate_variants`.

5. **Pull the result back.** Download the screen markup/assets.
   - Tools: `mcp__stitch__download_assets`, `mcp__stitch__list_screens`.

6. **Port into React.** Re-implement the Dashboard using existing primitives —
   [Card](../apps/web/src/components/ui/card.tsx),
   [Skeleton](../apps/web/src/components/ui/skeleton.tsx),
   [StatusBadge](../apps/web/src/components/StatusBadge.tsx), lucide icons, Tailwind tokens. Keep the
   `useDashboard()` hook and data wiring unchanged — redesign is presentational only. Reconcile any
   new tokens Stitch introduces back into [index.css](../apps/web/src/index.css) rather than
   hardcoding colors.

## Critical files

- `design/stitch/design.md` — **new**, the Stitch design system spec derived from index.css.
- [apps/web/src/index.css](../apps/web/src/index.css) — token source of truth; absorb any new tokens
  here.
- [apps/web/src/features/dashboard/Dashboard.tsx](../apps/web/src/features/dashboard/Dashboard.tsx) —
  pilot screen to re-skin (logic untouched).
- [apps/web/src/components/ui/](../apps/web/src/components/ui/) — reuse these primitives; only extend
  if the redesign needs a component that doesn't exist yet.

## After the pilot (scale-out, not part of this pass)

Once the Dashboard pipeline is validated, repeat steps 3–6 per screen: Login, Contacts
(List/Detail/Form), Pipeline, Products, Campaigns, Templates, Outreach, Followups — reusing the same
Stitch project + design system.

## Verification

- Render check inside Stitch via `mcp__stitch__get_screen` before porting.
- After porting: `pnpm --filter web dev` (or `pnpm dev:web`) and visually confirm the redesigned
  Dashboard in light **and** dark mode, desktop + mobile breakpoints (sidebar collapses < lg).
- `pnpm --filter web typecheck` to confirm no type regressions.
- Confirm data still populates (stat cards, Recent Replies list, Pipeline Overview) — the
  `useDashboard()` wiring must be unchanged.
