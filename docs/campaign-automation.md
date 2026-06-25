# Campaign Automation — Bulk Email + Auto Stage Management (Hybrid CRM + n8n)

## Context

We have live contacts in the Sales Pipeline and a Campaign already created. This doc answers two questions: **(1) what is a Campaign supposed to do?** and **(2) how do we send bulk email and auto-manage pipeline stages** — using an **n8n workflow**, a **professional Google Workspace email**, and **Resend** for sending.

**What a Campaign does today:** almost nothing on its own. A `Campaign` is an organizational container linking a `Product` to `Outreach` records; its `status` (`DRAFT/ACTIVE/PAUSED/COMPLETED`) is **decorative and triggers no behavior**. The real sending engine already exists and works:

- `POST /api/outreach/bulk` creates `Outreach` rows (`status=PENDING`).
- A node-cron job every minute (`apps/api/src/lib/cron.ts`) runs `processPendingOutreach` → `processOutreachItem` (`apps/api/src/lib/outreach.ts`): renders the template, sends via **Resend** (`apps/api/src/lib/email.ts`, fully wired with a simulated fallback), marks `SENT`, logs an `EMAIL_SENT` activity, and **auto-advances the contact `NEW → CONTACTED`**.
- A Resend webhook (`/api/webhooks/resend`) can mark contacts `REPLIED` / log bounces.

**Decisions (confirmed):** Hybrid orchestration (CRM keeps sending; n8n adds reply detection + acts as scheduler/glue), n8n watches the **Gmail** inbox for replies, **multi-step drip** sequences, host = **Google Workspace / Gmail**.

**Intended outcome:** A Campaign becomes a real engine — an ordered email **sequence** that you **enroll** contacts into; when `ACTIVE`, the CRM sends step 1, waits N days, sends follow-ups *only if no reply*, and auto-advances pipeline stages. n8n watches your Gmail and tells the CRM when someone replies (→ `REPLIED`, sequence stops).

> Two gaps found during exploration must be fixed early: the reply webhook only advances `NEW → REPLIED` (but the first send already set `CONTACTED`), and outreach never sets a `reply_to` header (so replies would not thread back into the watched mailbox).

---

## Where this fits — the full funnel (cross-module)

This module is the second half of an end-to-end funnel that begins in the Prospecting module ([prospecting-module-plan.md](./prospecting-module-plan.md)):

```
Discover ─▶ Enrich ─▶ Qualify ─▶ Import          ─▶ Enroll ─▶ Send (drip) ─▶ Auto stages
  └────────── Prospect (prospecting module) ──────┘   └──── Campaign (this module) ────┘
                                                            Contact ──▶ Pipeline (NEW…CUSTOMER)
```

**Ownership (to avoid divergence between the two docs):** this doc owns the three "automation & compliance" concerns that Prospecting's roadmap previously deferred to its Phase 4 — **n8n workflows, GDPR opt-out/suppression, and campaign enrollment**. Prospecting keeps only prospecting-specific automation (periodic refresh / re-discovery). Two cross-module obligations follow from that and are specified below:

- **Suppression is enforced at *import*, not just at send** (Phase 1e) — a contact who opted out must not be silently re-created by a later prospect import.
- **Enrollment is the bridge** from an imported Contact into a Campaign (Phase 1d / 2); "auto-enroll on import/qualify" is the optional automation that closes the loop.

---

## Operating workflow (town by town)

The module is operated **one town at a time, and always initiated by you**. Each town is a self-contained cycle:

1. **Discover** — open the Discover dialog, enter a search term + one **town/city** (e.g. `fogászat`, `Szentendre`). The dentist-only filter runs server-side; each prospect is stored with its `city` (Budapest district queries store `city = "Budapest"`).
2. **Curate** — review the Prospecting table for that town: enrich (website → email, dentist/staff counts, fit score), qualify/disqualify, edit. This is the human gate that makes the list "curated".
3. **Import & start campaign (one step)** — from the Prospecting page, run **Import & start campaign** on the curated/filtered list. In one action it:
   - bulk-imports the eligible prospects (has email, not yet imported, **not suppressed**) into Contacts, carrying the town onto `Contact.city`;
   - creates a Campaign scoped to the **selected product** and the **town** (`Campaign.city`), default-named `"{Product} — {City} {Mon YYYY}"`;
   - enrolls exactly those new contacts into the campaign's sequence.
4. **Send & auto-manage** — launching the campaign (status `ACTIVE`) lets the CRM send the drip via Resend and advance pipeline stages (`NEW → CONTACTED`); n8n watches Gmail and flips repliers to `REPLIED`, stopping their sequence.
5. **Next town** — repeat. Each town yields its own campaign, so metrics, pacing, and pause/resume are per-town.

> Because every Contact and Campaign carries `city`, you can later re-target a town, compare reply rates across towns, or throttle sending per town independently — and a single contact is never enrolled twice (the enrollment unique key is `[campaignId, contactId]`).

---

## Target architecture

```
Pipeline contacts ──enroll──▶ Campaign (sequence of steps)
                                  │  status=ACTIVE
                                  ▼
          [CRM] sequence advancer (cron, every minute)
                 creates Outreach (PENDING) for the due step,
                 skipping contacts that replied / unsubscribed
                                  ▼
          [CRM] outreach queue (cron) ──Resend──▶ email sent
                 reply_to = your Workspace mailbox
                 contact NEW → CONTACTED, activity logged
                                  ▼
   recipient replies ──▶ lands in Gmail ──▶ [n8n] Gmail trigger
                 extracts From address, POSTs secured CRM webhook
                                  ▼
          [CRM] /api/webhooks/reply  → contact → REPLIED,
                 enrollment stopped, REPLY_RECEIVED logged
```

Division of labor:

- **CRM owns** sending, the drip schedule, stage transitions, and "stop on reply" logic (one source of truth; robust regardless of n8n uptime).
- **n8n owns** the one thing the CRM cannot do alone: detecting human replies in your Gmail inbox, plus optional opt-out / notification glue.
- **Resend** is outbound transport only (it does not capture human replies — those go to your mailbox, which is why n8n watches Gmail).

---

## Phased roadmap

| Phase | Milestone | Scope |
|------|-----------|-------|
| 1 | **Bulk send + reply automation** | Enroll endpoint, reply-to header, fix CONTACTED→REPLIED, secure inbound webhook, n8n Gmail→reply workflow, unsubscribe/suppression |
| 2 | **Multi-step drip** | `CampaignStep` + `CampaignEnrollment` models, sequence-advancer cron, Campaign `ACTIVE/PAUSED` finally gates sending, campaign UI (steps editor + Launch/Enroll) |
| 3 | **Hardening & analytics** | Resend signature verification, n8n API-key for richer flows, per-campaign/step metrics, Resend rate-limit throttling, deliverability/warm-up |

Phases 1–2 are the core request; Phase 3 is polish.

---

## Phase 1 — Bulk send + reply automation (reuses existing engine)

### 1a. Make replies land where n8n can see them — `apps/api/src/lib/outreach.ts`, `apps/api/src/lib/email.ts`
- `processOutreachItem` must pass `replyTo` to `sendEmail` (the param already exists in `email.ts`; it is simply never used). Source the address from a new env `REPLY_TO_EMAIL` (your Workspace mailbox, e.g. `you@yourdomain.com`).
- This guarantees recipient replies arrive in the Gmail inbox that n8n watches.

### 1b. Fix the reply→stage bug — `apps/api/src/modules/webhooks/routes.ts`
- Current logic only advances `NEW → REPLIED`. Since the first send sets `CONTACTED`, change it to advance from `NEW` **or** `CONTACTED` → `REPLIED` (do not downgrade later stages like `INTERESTED` / `CUSTOMER`).

### 1c. Secure the inbound webhook(s) — `apps/api/src/modules/webhooks/routes.ts`, `apps/api/src/env.ts`, `.env.example`
- Add `N8N_WEBHOOK_SECRET` env. Inbound webhooks called by n8n must present it in a header (e.g. `x-webhook-secret`); reject with 401 otherwise. This is the minimal secure path — n8n only needs to POST events, not full API access (so no API-key auth is required in Phase 1).
- Add a dedicated `POST /api/webhooks/reply` route (clearer contract than overloading the Resend route): body `{ email, subject?, receivedAt? }` → find contact by email → set `REPLIED` (per 1b) → log `REPLY_RECEIVED` → **stop any active enrollment** (Phase 2 wires the enrollment stop; Phase 1 just sets the stage).

### 1d. City scoping + enroll + one-step "Import & start campaign" — `packages/db/prisma/schema.prisma`, `apps/api/src/modules/{prospecting,campaigns}/routes.ts`, `packages/types/src/index.ts`
- **City scoping (schema):** add `city String?` to `Prospect` (set at discovery from the town), `Contact` (carried over at import), and `Campaign` (the town the campaign targets). Index `Contact.city` and `Campaign.city`. This is what makes a campaign "for the given town" and enables per-town metrics/re-targeting.
- **Discovery persists the town** — `apps/api/src/modules/prospecting/routes.ts`: store the town used onto each created prospect's `city` (`"Budapest"` for district queries).
- **Enroll building block:** `POST /api/campaigns/:id/enroll` with `{ contactIds?: string[]; all?: boolean; filter? }` — mirror the proven bulk pattern in `import-to-crm` and `outreach/bulk`. In Phase 1 (no steps yet) it bulk-creates step-1 `Outreach` from the campaign's template; in Phase 2 it creates `CampaignEnrollment` rows. Skip `unsubscribedAt` / suppressed contacts.
- **One-step action (the workflow's step 3):** `POST /api/prospects/import-to-campaign` with `{ ids?|all?|filter, productId, city, campaignName?, templateId|sequence }` → imports eligible prospects into Contacts (carrying `city`, honoring `Suppression` per 1e) → creates the Campaign (`productId`, `city`, default name `"{Product} — {City} {Mon YYYY}"`, status `DRAFT`) → enrolls the new contacts → returns `{ imported, skipped, campaignId }`. Composes the existing bulk-import logic + campaign create + the enroll building block (no duplicated send code).
- **Web:** an **Import & start campaign** dialog on the Prospecting page (select product, town prefilled from the filtered set, editable campaign name, choose template/sequence, "Save as draft" or "Launch now"). Reuse the existing bulk-import action's selection/filter state.

### 1e. Opt-out / GDPR suppression (cross-module) — `packages/db/prisma/schema.prisma`, webhooks, `apps/api/src/modules/prospecting/routes.ts`
- Add `Contact.unsubscribedAt DateTime?`. Suppress sends for unsubscribed contacts in `processOutreachItem`.
- Add `POST /api/webhooks/unsubscribe` (secret-protected) and include a plain unsubscribe line/footer in `bodyToHtml` output. Required for cold-outreach compliance.
- **Persist a suppression set that survives the contact.** When someone opts out, also record their email (and optionally domain) in a lightweight `Suppression` table — because the originating `Contact` may later be deleted, yet the address must stay suppressed. A simple model:
  ```prisma
  model Suppression {
    id        String   @id @default(cuid())
    email     String   @unique
    reason    String?            // "unsubscribe" | "bounce" | "manual"
    createdAt DateTime @default(now())
  }
  ```
- **Enforce suppression at import, not only at send.** The Prospecting → CRM bridge (`POST /api/prospects/import-to-crm`, single + bulk) must skip any prospect whose `generalEmail` is in `Suppression` (or belongs to an `unsubscribedAt` contact), so an opted-out clinic is never silently re-created by a later discovery/import. Surface skipped-as-suppressed counts in the import response. This closes the gap that send-level suppression alone leaves open.

### 1f. n8n workflow #1 — Reply sync
- **Trigger:** Gmail node (Google Workspace OAuth) on new message in Inbox (optionally a label/filter for campaign replies).
- **Function:** extract sender email + subject.
- **HTTP Request:** `POST {API_URL}/api/webhooks/reply` with header `x-webhook-secret: {{N8N_WEBHOOK_SECRET}}` and JSON body `{ email, subject, receivedAt }`.
- Result: CRM flips the contact to `REPLIED` and stops their sequence.

---

## Phase 2 — Multi-step drip

### 2a. Data model — `packages/db/prisma/schema.prisma` (new migration)
```prisma
model CampaignStep {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  stepOrder  Int                       // 1, 2, 3...
  templateId String
  template   EmailTemplate @relation(fields: [templateId], references: [id])
  dayOffset  Int                       // days after enrollment that this step fires
  @@unique([campaignId, stepOrder])
}

enum EnrollmentStatus { ACTIVE REPLIED COMPLETED UNSUBSCRIBED BOUNCED }

model CampaignEnrollment {
  id          String   @id @default(cuid())
  campaignId  String
  contactId   String
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  contact     Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  status      EnrollmentStatus @default(ACTIVE)
  currentStep Int      @default(0)
  nextRunAt   DateTime?         // when the next step is due
  enrolledAt  DateTime @default(now())
  @@unique([campaignId, contactId])
}
```
- Add an optional `enrollmentId` to `Outreach` so sends trace back to a step.

### 2b. Sequence advancer — `apps/api/src/lib/sequence.ts` (new) + `apps/api/src/lib/cron.ts`
- New cron worker `processSequenceQueue`: for `CampaignEnrollment` where `status=ACTIVE`, `nextRunAt <= now()`, and **campaign.status = ACTIVE**, and contact not replied/unsubscribed → create the next step's `Outreach` (PENDING; the existing outreach cron sends it), bump `currentStep`, set `nextRunAt` from the next step's `dayOffset`, or mark `COMPLETED` after the last step.
- This is where **Campaign `ACTIVE/PAUSED` finally means something** — pausing halts the advancer; this directly answers "what should the campaign be doing."
- Reuse the existing batch/queue conventions from `processPendingOutreach` / `processEnrichmentQueue`.

### 2c. Reply/unsubscribe stops the sequence — `apps/api/src/modules/webhooks/routes.ts`
- On `reply` / `unsubscribe`, set the contact's active enrollment(s) to `REPLIED` / `UNSUBSCRIBED` so no further steps send.

### 2d. Campaign UI — `apps/web/src/features/campaigns/Campaigns.tsx` (+ new step editor)
- Steps editor (ordered template + dayOffset rows), a **Launch** action (sets `ACTIVE`), an **Enroll contacts** action (reuse contact filters), and an enrollment/status view. Mirror existing feature structure in `apps/web/src/features/outreach/` and `prospecting/`.

---

## Phase 3 — Hardening & analytics (brief)
- Verify Resend webhook signatures (Svix) on `/api/webhooks/resend`.
- Add API-key auth (hashed key + bearer check in `apps/api/src/plugins/auth.ts`) if n8n later needs to read/write arbitrary CRM data.
- Per-campaign/step metrics in the dashboard (sent, reply rate, conversion by step).
- Throttle to Resend rate limits (cap batch size / stagger `scheduledAt`).

---

## Config & deliverability (Google Workspace + Resend)
- **Verify your sending domain in Resend** (add DKIM/SPF records; set DMARC). Set `RESEND_FROM_EMAIL` to an address on that verified domain.
- Set `REPLY_TO_EMAIL` to your Workspace mailbox so replies thread into Gmail for n8n.
- New env vars (add to `apps/api/src/env.ts` + `.env.example`): `REPLY_TO_EMAIL`, `N8N_WEBHOOK_SECRET` (and Phase 3 `RESEND_WEBHOOK_SECRET`).
- Keep volume modest initially (warm-up); include an unsubscribe footer; only email contacts with a lawful basis (GDPR — the prospecting module already tracks `source`).

---

## Files (summary)
- **schema:** `packages/db/prisma/schema.prisma` (+ migration) — `city` on `Prospect`/`Contact`/`Campaign`, `Contact.unsubscribedAt`, `Suppression` (P1); `CampaignStep`, `CampaignEnrollment`, `EnrollmentStatus`, `Outreach.enrollmentId` (P2).
- **types:** `packages/types/src/index.ts` — enroll / import-to-campaign / step / webhook zod schemas.
- **prospecting bridge:** `apps/api/src/modules/prospecting/routes.ts` — persist `city` at discovery; enforce `Suppression` at `import-to-crm`; add the one-step `import-to-campaign` (P1).
- **api lib:** `apps/api/src/lib/email.ts` (reply_to), `apps/api/src/lib/outreach.ts` (reply_to + suppress unsubscribed), `apps/api/src/lib/sequence.ts` (new), `apps/api/src/lib/cron.ts` (advancer), `apps/api/src/env.ts`.
- **api routes:** `apps/api/src/modules/webhooks/routes.ts` (secret + reply/unsubscribe + stage fix + enrollment stop), `apps/api/src/modules/campaigns/routes.ts` (enroll/launch/steps).
- **web:** `apps/web/src/features/prospecting/ProspectingList.tsx` (**Import & start campaign** dialog); `apps/web/src/features/campaigns/Campaigns.tsx` (+ steps editor, Launch/Enroll, city display).
- **.env.example** and an exported **n8n workflow JSON** (reply sync).

---

## Verification (end-to-end)
1. **Domain:** verify the sending domain in Resend; set `RESEND_FROM_EMAIL` + `REPLY_TO_EMAIL`; confirm a single test send (`POST /api/outreach/:id/send`) arrives with the correct From and Reply-To.
2. **Town-by-town one-step (P1):** Discover one town (e.g. `fogászat Szentendre`) → confirm prospects store `city`; curate/enrich; run **Import & start campaign** with a product → confirm Contacts are created with `Contact.city` set, a Campaign is created with that `city` and the `"{Product} — {City} {Mon YYYY}"` name, and exactly those contacts are enrolled. Then watch the outreach cron send (use simulated mode locally first — no key needed) and confirm contacts move `NEW → CONTACTED` with `EMAIL_SENT` activities. Re-running for the same town skips already-imported/suppressed prospects.
3. **Reply automation:** wire the n8n Gmail trigger → `POST /api/webhooks/reply` with the secret; send a real reply from a test address → confirm the contact flips to `REPLIED`, a `REPLY_RECEIVED` activity is logged, and (P2) the enrollment stops with no further steps.
4. **Drip (P2):** define a 3-step sequence (day 0/3/7); enroll a contact; fast-forward `nextRunAt` (or shorten offsets) to confirm step 2/3 enqueue only when no reply, and that pausing the campaign halts the advancer.
5. **Opt-out (cross-module):** hit `/api/webhooks/unsubscribe`; confirm `unsubscribedAt` is set, a `Suppression` row is created, and the contact is skipped by both the advancer and the outreach queue. Then re-run a prospect import for the same email and confirm it is **skipped as suppressed** (not re-created).
6. **Security:** confirm inbound webhooks reject requests missing / mismatching `N8N_WEBHOOK_SECRET` (401).
