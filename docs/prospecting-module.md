## Recommendation

**Yes, build a small internal web app—but not merely a React frontend and not primarily as a Google Maps scraper.**

The best architecture is:

1. Discover Budapest dental clinics from several sources.
2. Store and deduplicate them in your own database.
3. Enrich each clinic from its own website.
4. Manually verify the best prospects.
5. Move qualified clinics into your CRM Sales Manager outreach pipeline.

A React/Next.js app becomes worthwhile because this is not a one-time export. You will need deduplication, enrichment, review, scoring, outreach status, follow-ups, suppression lists, and periodic refreshing.

---

## Your data-source options

### 1. Google Places API

Use Google Places for:

* clinic name
* address and district
* phone
* website
* opening hours
* rating and review count
* Google Place ID
* business status
* location

Google Place Details can return contact information such as phone numbers and other business details, depending on the requested field mask. ([Google for Developers][1])

**Strengths**

* Excellent coverage of active private clinics
* Useful for discovering clinics that are not well represented in B2B databases
* Ratings and review counts can help with lead scoring
* Website URLs provide the next enrichment step

**Limitations**

* Usually no email
* No reliable employee count
* One company may have several locations
* A shared medical centre may appear as multiple listings
* Google Maps Platform has usage, caching, attribution, and storage conditions

Do not scrape the consumer Google Maps website with Playwright or a browser bot. Use the official Places API, and review its current policies before persisting returned content. Google publishes separate Places API policies and service-specific terms. ([Google for Developers][2])

A safe design is to treat the **Google Place ID as the external reference**, retain your independently verified CRM data separately, and refresh volatile Google-derived fields when needed.

---

### 2. Clinic websites

Once Google gives you the clinic website, your system can inspect public pages such as:

* Contact
* About us
* Our team
* Dentists
* Impressum
* Adatkezelési tájékoztató
* Kapcsolat
* Rólunk
* Munkatársaink

You can often find:

* `info@clinic.hu`
* `recepcio@clinic.hu`
* `rendelo@clinic.hu`
* clinic legal name
* company tax number
* medical director or clinic manager
* number of dentists
* number of assistants
* number of locations
* booking software currently used

For your Sunshine Dental campaign, this clinic-capacity signal is far more useful than a generic company-headcount number.

A clinic with 15 registered company employees is not necessarily a better prospect than a clinic with:

* six dentists
* three treatment rooms
* two locations
* evening opening hours
* online booking
* high call volume

I would therefore store both:

```ts
employeeCount?: number;
dentistCount?: number;
assistantCount?: number;
locationCount?: number;
teamSizeEstimate?: number;
sizeConfidence?: "LOW" | "MEDIUM" | "HIGH";
```

---

### 3. Hungarian public sources (validation)

> **Scope decision:** this app does **not** use any paid B2B data providers. All enrichment comes from the clinic's own website plus free public sources. Headcount/capacity signals are derived from website extraction (dentists, treatment rooms, locations, online booking), not purchased employee-count datasets.

The NEAK publishes lists of contracted dental services, including searchable dental-service information. This is useful for validating publicly funded practices, although it will not represent every private clinic and usually will not provide sales contacts. ([NEAK][3])

The public Hungarian company register (Cégjegyzék) exposes basic, free company information that can validate a clinic's legal name, registered office, registration number, and tax number when the website Impressum is unclear. ([Company Formation Hungary][4])

---

## The workflow I would build

```text
Google Places / NEAK / manual CSV
                ↓
         Raw prospect import
                ↓
      Normalize and deduplicate
                ↓
        Fetch clinic website
                ↓
 Extract public business contacts
                ↓
       Confidence-based matching
                ↓
          Human review queue
                ↓
     Qualified CRM sales contact
                ↓
 Campaign → email → follow-up
```

### Important distinction

Keep these separate:

```text
Clinic/location
    Sunshine Dental Budapest XIII

Legal organization
    Sunshine Medical Kft.

Contacts
    Clinic manager
    Practice owner
    Reception email
```

One organization may operate multiple clinics, and one Google listing may not correspond cleanly to one company.

---

## Suggested database model

```prisma
model ProspectOrganization {
  id                    String   @id @default(cuid())

  brandName             String
  legalName             String?
  domain                String?
  website               String?
  generalEmail          String?
  phone                 String?

  employeeCount         Int?
  employeeCountSource   String?
  employeeCountAsOf     DateTime?

  dentistCount          Int?
  assistantCount        Int?
  locationCount         Int?
  teamSizeEstimate      Int?
  sizeConfidence        Confidence?

  linkedinUrl           String?
  taxNumber             String?
  companyRegistryNumber String?

  status                ProspectStatus @default(NEW)
  fitScore              Int?
  source                String
  sourceExternalId      String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  locations             ProspectLocation[]
  contacts              ProspectContact[]

  @@unique([source, sourceExternalId])
  @@index([domain])
  @@index([phone])
}

model ProspectLocation {
  id             String @id @default(cuid())
  organizationId String

  name           String
  address        String?
  district       String?
  googlePlaceId  String? @unique
  rating         Float?
  reviewCount    Int?
  businessStatus String?

  organization ProspectOrganization @relation(
    fields: [organizationId],
    references: [id]
  )
}

model ProspectContact {
  id             String @id @default(cuid())
  organizationId String

  firstName      String?
  lastName       String?
  jobTitle       String?
  email          String?
  phone          String?
  linkedinUrl    String?

  emailType      EmailType?
  source         String?
  verifiedAt     DateTime?
  confidence     Confidence?

  organization ProspectOrganization @relation(
    fields: [organizationId],
    references: [id]
  )
}

enum Confidence {
  LOW
  MEDIUM
  HIGH
}

enum EmailType {
  GENERIC
  PERSONAL_BUSINESS
  PERSONAL_PRIVATE
}

enum ProspectStatus {
  NEW
  ENRICHING
  NEEDS_REVIEW
  QUALIFIED
  DISQUALIFIED
  CONTACTED
  REPLIED
  CUSTOMER
}
```

---

## Recommended stack

Since you already work with React and Fastify, I would use:

```text
Web:       React 19 + Vite or Next.js 15
API:       Fastify 5
Database:  PostgreSQL + Prisma
Jobs:      BullMQ + Redis, or a PostgreSQL job table initially
Sources:   Google Places API + website extraction
Email:     Resend
Automation: n8n for enrichment and campaign workflows
```

A React-only client is insufficient because provider API keys must remain secret. Google Places, GLM, Resend and scraping/extraction requests should run from your backend.

For the first version, you can avoid Redis:

```text
enrichment_jobs
- id
- organization_id
- job_type
- status
- attempts
- scheduled_at
- started_at
- completed_at
- error
```

A scheduled Fastify worker or n8n workflow can process these jobs.

---

## MVP screens

The initial app needs only five screens:

### Import

* search term: `fogorvos Budapest`
* districts
* Google Places import
* CSV import
* NEAK import
* source and import date

### Prospect table

```text
Clinic | District | Website | Email | Staff | Score | Status
```

Filters:

* has website
* has email
* employee range
* dentist count
* review count
* district
* not contacted
* enrichment confidence

### Prospect review

Show each source separately:

```text
Google Places
Website
Public registry (NEAK / Cégjegyzék)
Manual overrides
```

Do not silently overwrite verified data. Let the reviewer accept or reject enrichment suggestions.

### Enrichment queue

```text
Waiting → Website scan → Needs review → Complete
```

### Export/send to CRM

Qualified records become actual CRM contacts and campaign members.

---

## How I would calculate clinic size

Instead of relying only on `empNumber`:

```ts
function calculateClinicSizeScore(input: {
  employees?: number;
  dentists?: number;
  locations?: number;
  reviews?: number;
  hasOnlineBooking: boolean;
}): number {
  const employeeScore = Math.min(input.employees ?? 0, 30);
  const dentistScore = Math.min((input.dentists ?? 0) * 5, 30);
  const locationScore = Math.min((input.locations ?? 1) * 8, 24);
  const reviewScore = Math.min(Math.floor((input.reviews ?? 0) / 25), 10);
  const bookingScore = input.hasOnlineBooking ? 6 : 0;

  return Math.min(
    employeeScore +
      dentistScore +
      locationScore +
      reviewScore +
      bookingScore,
    100,
  );
}
```

For Sunshine Dental, your ideal customers may be:

```text
3–15 dentists
1–4 locations
active website
substantial inbound phone traffic
no strong online/voice booking workflow
generic reception email available
owner or clinic manager identifiable
```

---

## Outreach and privacy warning

Do not assume that obtaining a clinic's email address automatically gives unlimited permission to send marketing emails.

Hungarian electronic-marketing rules distinguish between generic corporate addresses and addresses identifying natural people. Sources discussing Hungarian law indicate that personal business addresses can face stricter consent requirements, while a non-personal corporate address such as `info@clinic.hu` may be treated differently. ([Linklaters][5])

For the MVP:

* prioritize generic clinic addresses
* send individually relevant B2B messages
* clearly identify your company
* explain why the clinic was contacted
* provide a simple opt-out
* maintain a permanent suppression list
* avoid large automated blasts
* document the source and collection date
* obtain Hungarian legal review before scaling personal-address campaigns

---

## Best starting option for you

Start with:

```text
1. Google Places API for Budapest clinic discovery
2. Website extraction for generic email and team information
3. Manual review of the top 200 clinics
4. Export qualified prospects into your CRM Sales Manager
```

No paid B2B data providers are used — website extraction supplies the email and capacity signals we need.

Build the functionality as a **Prospecting module inside your existing CRM Sales Manager**, rather than creating an entirely separate React product:

```text
CRM Sales Manager
├── Prospects
│   ├── Sources
│   ├── Imports
│   ├── Enrichment queue
│   └── Review
├── Contacts
├── Pipeline
├── Campaigns
├── Templates
└── Follow-ups
```

This avoids maintaining two systems and gives you a reusable prospecting engine for your other SaaS products as well.

[1]: https://developers.google.com/maps/documentation/places/web-service/place-details?utm_source=chatgpt.com "Place Details (New) | Places API"
[2]: https://developers.google.com/maps/documentation/places/web-service/policies?utm_source=chatgpt.com "Policies and attributions for Places API"
[3]: https://www.neak.gov.hu/felso_menu/lakossagnak/szerzodott_szolgaltatok/fogorvosi_szolgalatok?utm_source=chatgpt.com "Fogorvosi szolgálatok"
[4]: https://company-formation-hungary.com/company-register/?utm_source=chatgpt.com "Company Register"
[5]: https://www.linklaters.com/en/insights/data-protected/data-protected---hungary?utm_source=chatgpt.com "Data Protected Hungary"
