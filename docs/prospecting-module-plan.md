# Prospecting Module — Implementation Plan (MVP + phased roadmap)

## Context

Rather than paying a B2B data provider to source dental-clinic prospects, we build an
in-CRM **Prospecting module** that discovers Budapest dental clinics, enriches them from their own
websites, lets a human qualify them, and exports the good ones into the existing Contact + Sunshine
Dental pipeline. This follows the recommendation in [prospecting-module.md](./prospecting-module.md)
(build it *inside* the CRM, not as a separate app) and applies the prompt-engineering principles in
[Advanced GLM 5.2 Prompt Engineering.md](./Advanced%20GLM%205.2%20Prompt%20Engineering.md)
(multi-stage prompts, strict structured-JSON output, low temperature for factual extraction) to the
website-extraction step.

We ship a thin end-to-end MVP first, then layer richer capabilities in phases.

**Decisions (confirmed with user):** single flat `Prospect` table for the MVP · Google Places
discovery with a simulated fallback when no key is present · website enrichment via the existing GLM
client, synchronous in the MVP.

---

## Phased roadmap

| Phase | Milestone | Scope |
|------|-----------|-------|
| **0 — MVP (this build)** | Discover → Enrich → Qualify → Export | Google Places discovery, per-prospect website enrichment (GLM), human review/qualify, export to CRM Contact. Flat `Prospect` table. Synchronous enrichment. |
| **1 — Bulk enrichment queue** | Background scanning | Status-column job queue + `node-cron` worker (reuse the outreach scheduler) for background website scans; multi-district batch discovery. |
| **2 — Scoring & review UX** | Trustworthy review | Source-by-source review (accept/reject enrichment, no silent overwrite), cross-source dedupe, fit-score tuning, suppression list. |
| **3 — Normalized model (optional)** | Multi-location clinic groups | Migrate the flat `Prospect` table to the normalized Organization/Location/Contact model from the guide for clinics that operate several sites. Headcount/capacity signals come from website extraction — **no paid B2B data providers**. |
| **4 — Automation & compliance** | Scale safely | Prospecting-specific automation only: periodic refresh / re-discovery cadence + staleness flags. **n8n, GDPR opt-out/suppression, and campaign enrollment are owned by [campaign-automation.md](./campaign-automation.md)** — and suppression is enforced here at prospect import (an opted-out email is never re-created). |

---

## Reusable patterns found in the codebase

- **GLM client already exists** at `packages/new-video/src/lib/glm.ts` — an OpenAI-compatible
  `glmJson<T>()` helper (json_object response format, retry/empty-response handling). Port it into the
  API for website extraction.
- **API module pattern:** async `(app: FastifyInstance) => {}` registered in `apps/api/src/routes.ts`
  under the protected scope; validation via zod from `@founder-crm/types`; data via `app.prisma`.
- **Scheduler:** `node-cron` DB-polling in `apps/api/src/lib/cron.ts` + `lib/outreach.ts` (template for
  the Phase 1 enrichment worker).
- **External calls with simulated fallback:** `apps/api/src/lib/email.ts` (native `fetch`, typed
  result, "simulated" mode when no key) — the model for the Places client.
- **Activity log:** `apps/api/src/lib/activity.ts` `logActivity()`.
- **Web:** feature page pattern (`features/contacts/ContactsList.tsx`), `router.tsx`, `AppLayout` `NAV`
  array, `StatusBadge.tsx`, `lib/hooks.ts` + `lib/api.ts`.

---

## MVP scope (Phase 0)

### 1. Data model — `packages/db/prisma/schema.prisma`
Add a flat `Prospect` model + two enums, and a back-relation on `Contact`.

```prisma
enum ProspectStatus { NEW  ENRICHED  NEEDS_REVIEW  QUALIFIED  DISQUALIFIED  IMPORTED }
enum ProspectSource { GOOGLE_PLACES  CSV  MANUAL }

model Prospect {
  id               String   @id @default(cuid())
  brandName        String
  legalName        String?
  website          String?
  domain           String?
  generalEmail     String?
  phone            String?
  address          String?
  district         String?
  googlePlaceId    String?  @unique     // external ref / dedupe key
  rating           Float?
  reviewCount      Int?
  businessStatus   String?
  dentistCount     Int?
  locationCount    Int?
  employeeCount    Int?
  hasOnlineBooking Boolean  @default(false)
  fitScore         Int?
  status           ProspectStatus @default(NEW)
  source           ProspectSource
  notes            String?
  enrichedAt       DateTime?
  importedContactId String? @unique
  importedContact  Contact? @relation(fields: [importedContactId], references: [id], onDelete: SetNull)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([status])
  @@index([district])
  @@map("prospects")
}
```
On `Contact`, add the back-relation `prospect Prospect?`. Migration:
`pnpm db:migrate -- --name add_prospect_model`.

> Note: `dentistCount / locationCount / hasOnlineBooking` are kept because the guide argues clinic
> *capacity* is a better fit signal than raw company headcount for the Sunshine Dental campaign.

### 2. Shared types — `packages/types/src/index.ts`
Add `PROSPECT_STATUSES`, `PROSPECT_SOURCES` const arrays (same style as `CONTACT_STATUSES`), plus zod
schemas: `prospectDiscoverSchema` (`{ query?, districts?: string[], limit? }`), `prospectUpdateSchema`,
`prospectSearchSchema` (`q, status, district, hasWebsite, hasEmail, page, pageSize`).

### 3. API module — `apps/api/src/modules/prospecting/routes.ts` (new)
Registered in `apps/api/src/routes.ts` inside the protected scope:
- `POST /api/prospects/discover` — Google Places Text Search by query/districts; upsert by
  `googlePlaceId`; returns `{ discovered, created, skipped }`.
- `GET /api/prospects` — filtered + paginated list (mirror the contacts list handler).
- `GET /api/prospects/:id`, `PATCH /api/prospects/:id` — manual edits / status changes.
- `POST /api/prospects/:id/enrich` — website fetch + GLM extraction → store fields, recompute
  `fitScore`, set `status`, `enrichedAt`.
- `POST /api/prospects/:id/import-to-crm` — create a `Contact` (company=brandName,
  email=generalEmail, empNumber=employeeCount, website/phone, industry="Dental", country="Hungary",
  productId=Sunshine Dental, status NEW), link `importedContactId`, set prospect `status=IMPORTED`,
  `logActivity` on the new contact. Reuse the contact-creation shape from
  `apps/api/src/modules/contacts/routes.ts`. **This endpoint is the bridge into outreach** — once a
  prospect is a Contact it can be enrolled into a Campaign; see
  [campaign-automation.md](./campaign-automation.md) for the full Prospect → Contact → Campaign →
  Pipeline funnel. (A bulk variant — single + `all`/filter — already exists and must honour the
  suppression set per campaign-automation Phase 1e.)

### 4. API libs (new, follow existing patterns)
- `lib/places.ts` — Google Places **Text Search (New)** via `fetch`
  (`POST https://places.googleapis.com/v1/places:searchText`, `X-Goog-FieldMask`), typed result +
  **simulated fallback** mock clinics when `GOOGLE_PLACES_API_KEY` is unset (mirrors `email.ts`).
- `lib/glm.ts` — port `glmJson<T>()` from `packages/new-video/src/lib/glm.ts`.
- `lib/prospect-enrich.ts` — fetch website HTML, strip scripts/styles/tags to text (lightweight regex,
  truncate ~6 k chars; no new HTML-parser dep), call `glmJson` with a strict extraction prompt.
  **Applies the GLM guide:** persona framing, explicit output JSON schema, `temperature: 0.2`, and a
  "return null when unknown — never invent" rule. Extracts `generalEmail, legalName, dentistCount,
  locationCount, hasOnlineBooking`.
- `lib/prospect-score.ts` — `calculateClinicSizeScore()` exactly as in the guide.
- `apps/api/src/env.ts` — add `googlePlacesApiKey`, `glmApiKey`, `glmBaseUrl`
  (default `https://api.z.ai/api/paas/v4/`), `glmModel` (default `glm-5.2`); document in `.env.example`.

### 5. Web — `apps/web/src/features/prospecting/` (new)
- `ProspectingList.tsx` — `PageHeader` (Discover + Import CSV actions), filter card (search, status,
  district, has-website, has-email), table `Clinic | District | Website | Email | Staff | Score |
  Status` with row actions (Enrich, Qualify/Disqualify, Import to CRM), pagination — mirroring
  `ContactsList.tsx`.
- `DiscoverDialog.tsx` — search term (default `fogorvos Budapest`) + district multi-select → `/discover`.
- `ProspectDetail.tsx` (route `/prospecting/$id`) — Google-Places vs Website-derived fields, manual
  override form, qualify + import buttons.
- `lib/hooks.ts` — add `Prospect` type + `useProspects`, `useProspect`, discover/enrich/import
  mutations.
- `router.tsx` — `/prospecting` and `/prospecting/$id` routes under the protected layout.
- `components/layout/AppLayout.tsx` — add a **Prospecting** nav item (`Target` icon).
- `components/StatusBadge.tsx` — add `ProspectStatusBadge`.

### 6. GDPR guardrails (MVP)
Persist `source` + creation date; prefer generic clinic emails; surface UI copy that full
suppression/opt-out arrives later. Full suppression/opt-out (and its enforcement at the
`import-to-crm` bridge so opted-out clinics are never re-imported) is owned by
[campaign-automation.md](./campaign-automation.md) Phase 1e.

---

## Files (summary)
- **New API:** `modules/prospecting/routes.ts`, `lib/places.ts`, `lib/glm.ts`,
  `lib/prospect-enrich.ts`, `lib/prospect-score.ts`
- **New web:** `features/prospecting/{ProspectingList,DiscoverDialog,ProspectDetail}.tsx`
- **Modified:** `schema.prisma` (+migration), `packages/types/src/index.ts`, `apps/api/src/routes.ts`,
  `apps/api/src/env.ts`, `.env.example`, `apps/web/src/lib/hooks.ts`, `apps/web/src/router.tsx`,
  `components/layout/AppLayout.tsx`, `components/StatusBadge.tsx`

## Verification
1. `pnpm db:migrate` applies; `prospects` table + enums exist.
2. `pnpm dev`; open **Prospecting**. With no `GOOGLE_PLACES_API_KEY`, **Discover** returns simulated
   clinics; deduped by place id on re-discover.
3. With a real key, Discover returns live Budapest clinics.
4. **Enrich** a prospect with a website → with `GLM_API_KEY` set,
   generalEmail/dentistCount/booking + `fitScore` populate (without a key, a clear "GLM_API_KEY not
   set" error surfaces).
5. **Import to CRM** → a Contact is created (linked to Sunshine Dental, `empNumber` from
   `employeeCount`); prospect flips to `IMPORTED` and links `importedContactId`; contact appears in the
   Contacts list.
6. `pnpm typecheck` passes for api + web.
