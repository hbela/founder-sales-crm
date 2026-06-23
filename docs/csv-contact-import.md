# Feature: CSV Contact Import + `empNumber`

## Context

Sales users need to bulk-load potential clients (e.g. dental clinics) into the CRM from a
CSV file rather than entering each contact by hand via the single-contact form. As part of
this, the `Contact` record gains a new numeric `empNumber` field — the number of employees
at the contact's company — a useful qualifier and sort key for prospecting.

There is **no separate `Company` model** in the schema (`company` is just a string field on
`Contact`), so `empNumber` lives directly on `Contact`, representing the headcount of that
contact's company.

Imported contacts are auto-linked to the existing seeded **Sunshine Dental** product
(`slug: "sunshine-dental"`) with default status `NEW`. The CSV uses a **fixed column
template** (no in-app column mapping). A realistic **sample CSV of Budapest dental clinics**
is generated so the feature is testable immediately; real data is swapped in later.

Decisions: sample CSV generated in-repo · fixed template · default product = Sunshine Dental.

---

## Part 1 — Add `empNumber` to Contact

**Schema** — [packages/db/prisma/schema.prisma](../packages/db/prisma/schema.prisma) `Contact` model (line ~81):
add `empNumber  Int?` (nullable; existing rows get NULL).

Create the migration:
`pnpm --filter @founder-crm/db exec prisma migrate dev --name add_contact_emp_number`
(or the repo's existing `db:migrate` script), then regenerate the client.

**Shared Zod** — [packages/types/src/index.ts](../packages/types/src/index.ts) `contactCreateSchema` (line ~72):
add an `empNumber` field. Use `preprocess` so empty strings from the form become `undefined`
(plain `z.coerce.number()` would coerce `""` → `0`):

```ts
empNumber: z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().min(0).max(10_000_000).optional()
),
```

`contactUpdateSchema` (`.partial()`) picks this up automatically.

**API** — [apps/api/src/modules/contacts/routes.ts](../apps/api/src/modules/contacts/routes.ts):
- In `POST /api/contacts` `clean` object (line ~41): add `empNumber: data.empNumber ?? null`.
- In `PATCH /api/contacts/:id` `clean` (line ~83): add
  `...(data.empNumber !== undefined ? { empNumber: data.empNumber } : {})`.

**Web type** — [apps/web/src/lib/hooks.ts](../apps/web/src/lib/hooks.ts) `Contact` type (line ~20):
add `empNumber?: number | null`.

**Form** — [apps/web/src/features/contacts/ContactForm.tsx](../apps/web/src/features/contacts/ContactForm.tsx):
- Add `empNumber: ""` to `EMPTY` (line ~22) and to the `useEffect` reset
  (`empNumber: contact.empNumber?.toString() ?? ""`, line ~44).
- Add a numeric `<Input type="number" min={0}>` for "Employees" in the grid (near Company).
- In `onSubmit` payload (line ~70): convert
  `empNumber: form.empNumber ? Number(form.empNumber) : undefined`.

**List** — [apps/web/src/features/contacts/ContactsList.tsx](../apps/web/src/features/contacts/ContactsList.tsx):
add an "Employees" `<TableHead>` and a `<TableCell>{c.empNumber ?? "—"}</TableCell>`
(update the empty-state `colSpan` from 7 → 8).

---

## Part 2 — CSV import feature

### Fixed CSV template
Column headers (order-independent, parsed by name):
`firstName, lastName, company, email, phone, website, industry, country, empNumber, notes`

Only `firstName`, `lastName`, `email` are required per row. `productId` and `status` are NOT
in the CSV — set server-side (Sunshine Dental / `NEW`).

### Shared Zod — [packages/types/src/index.ts](../packages/types/src/index.ts)
Add an import-row schema reusing `contactCreateSchema` plus the request wrapper:

```ts
export const contactImportRowSchema = contactCreateSchema.pick({
  firstName: true, lastName: true, company: true, email: true, phone: true,
  website: true, industry: true, country: true, empNumber: true, notes: true,
});
export type ContactImportRow = z.infer<typeof contactImportRowSchema>;

export const contactImportSchema = z.object({
  rows: z.array(contactImportRowSchema).min(1).max(2000),
  productId: z.string().cuid().optional(), // defaults to Sunshine Dental server-side
});
```

### API — new endpoint `POST /api/contacts/import`
In [apps/api/src/modules/contacts/routes.ts](../apps/api/src/modules/contacts/routes.ts), add a handler that:
1. Parses body with `contactImportSchema`.
2. Resolves product: use `productId` if given, else
   `prisma.product.findUnique({ where: { slug: "sunshine-dental" } })`.
3. Pre-loads existing emails for the batch in one query, skips rows whose email already
   exists (report as `skipped`), and de-dupes emails within the file itself.
4. Inserts remaining rows inside a `prisma.$transaction` (mirrors the existing bulk pattern
   in [apps/api/src/modules/outreach/routes.ts](../apps/api/src/modules/outreach/routes.ts) lines ~33-44), each with `productId`,
   `status: "NEW"`, and per-row `logActivity({ type: "CONTACT_CREATED" })`.
5. Returns a summary: `{ created, skipped, errors: { row, email, message }[] }`.

Added to the already-registered `contactRoutes` — no change to route registration.

### Web — upload UI
- Add **papaparse** to the web app: `pnpm --filter web add papaparse` + `-D @types/papaparse`.
  (No CSV lib exists today; papaparse handles quoting/edge cases robustly.)
- New component `apps/web/src/features/contacts/ImportContactsDialog.tsx`:
  - `<input type="file" accept=".csv">`, parse with `Papa.parse(file, { header: true, skipEmptyLines: true })`.
  - Map/normalize rows to `ContactImportRow` shape; coerce `empNumber` to number.
  - Validate headers against the template; show a small **preview table** (first ~10 rows)
    and total row count before importing.
  - On confirm: `api.post("/api/contacts/import", { rows })`; toast the
    created/skipped/error summary; invalidate `["contacts"]` and `["dashboard"]`.
  - A "Download template" link that builds the header-only CSV via a Blob (no static asset).
- Wire an **"Import CSV"** `<Button variant="outline">` into the `PageHeader` action in
  [apps/web/src/features/contacts/ContactsList.tsx](../apps/web/src/features/contacts/ContactsList.tsx) (line ~50), alongside "New Contact",
  and render `<ImportContactsDialog>` next to the existing `<ContactForm>`.

### Sample data
Create `sample-data/budapest-dental-clinics.csv` at the repo root: ~20-30 realistic Budapest
dental clinic rows in the template columns, with varied `empNumber` values and placeholder
`.hu` emails that won't collide with the three seeded sample contacts. This is the file the
user imports to test, and the template they replace with real data.

> **Sourcing real clinic data later** (out of scope here): Google Places/Maps API gives
> name/address/phone/website but no email or headcount; a scraper against a business
> directory yields more but is messy/ToS-sensitive; a B2B data provider (Apollo, Cognism)
> gives email + employee count directly — the cleanest source for real `empNumber` data.

---

## Files touched (summary)
- `packages/db/prisma/schema.prisma` — `empNumber Int?` + new migration
- `packages/types/src/index.ts` — `empNumber` on contact schema; import schemas
- `apps/api/src/modules/contacts/routes.ts` — `empNumber` handling + `POST /import`
- `apps/web/src/lib/hooks.ts` — `Contact.empNumber`
- `apps/web/src/features/contacts/ContactForm.tsx` — employees input
- `apps/web/src/features/contacts/ContactsList.tsx` — employees column + Import button
- `apps/web/src/features/contacts/ImportContactsDialog.tsx` — **new**
- `apps/web/package.json` — papaparse dependency
- `sample-data/budapest-dental-clinics.csv` — **new**

## Verification
1. `pnpm db:migrate` (or filtered prisma migrate) succeeds; `empNumber` column exists.
2. Start API + web (`pnpm dev`). Open **Contacts**.
3. Create/edit a contact, set Employees → value persists and shows in the list column.
4. Click **Import CSV** → upload `sample-data/budapest-dental-clinics.csv` → preview renders
   → confirm. Toast reports `created` ≈ row count, `skipped` for duplicate emails.
5. Imported contacts appear linked to **Sunshine Dental**, status **NEW**, with `empNumber`
   populated. Re-importing the same file reports all rows skipped (idempotent on email).
6. Import a CSV with a bad row (missing email / non-numeric empNumber) → that row is reported
   in `errors`, valid rows still import.
