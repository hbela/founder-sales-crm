import type { FastifyInstance } from "fastify";
import type { Prospect } from "@founder-crm/db";
import {
  prospectDiscoverSchema,
  prospectUpdateSchema,
  prospectSearchSchema,
  prospectEnqueueSchema,
  prospectImportSchema,
  prospectImportToCampaignSchema,
} from "@founder-crm/types";
import { discoverPlaces } from "../../lib/places.js";
import { enrichFromWebsite } from "../../lib/prospect-enrich.js";
import { calculateClinicSizeScore } from "../../lib/prospect-score.js";
import { logActivity } from "../../lib/activity.js";

function domainOf(website?: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Most frequent non-null city in a batch of prospects (for default campaign scope). */
function dominantCity(prospects: Prospect[]): string | null {
  const counts = new Map<string, number>();
  for (const p of prospects) {
    if (p.city) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [city, n] of counts) {
    if (n > bestN) {
      best = city;
      bestN = n;
    }
  }
  return best;
}

interface ImportOutcome {
  imported: number;
  contactIds: string[];
  skipped: { brandName: string; reason: string }[];
}

interface ImportTargets {
  recipients: Prospect[];
  skipped: { brandName: string; reason: string }[];
}

/**
 * Read-only partition of eligible prospects into those that will be imported
 * (unique email, not already a contact, not suppressed) vs. skipped + reason.
 * Used by both the dry-run preview and the real import so they never diverge.
 */
async function partitionEligibleForImport(app: FastifyInstance, prospects: Prospect[]): Promise<ImportTargets> {
  const emails = prospects.map((p) => p.generalEmail).filter((e): e is string => !!e);
  const existing = emails.length
    ? await app.prisma.contact.findMany({ where: { email: { in: emails } }, select: { email: true } })
    : [];
  const taken = new Set(existing.map((e) => e.email));

  // Cross-module suppression: never re-import an opted-out / bounced address.
  const suppressedRows = emails.length
    ? await app.prisma.suppression.findMany({
        where: { email: { in: emails.map((e) => e.toLowerCase()) } },
        select: { email: true },
      })
    : [];
  const suppressed = new Set(suppressedRows.map((s) => s.email));

  const recipients: Prospect[] = [];
  const skipped: { brandName: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const prospect of prospects) {
    const email = prospect.generalEmail;
    if (!email) continue;
    if (suppressed.has(email.toLowerCase())) {
      skipped.push({ brandName: prospect.brandName, reason: "On suppression list (opted out)" });
      continue;
    }
    if (taken.has(email) || seen.has(email)) {
      skipped.push({ brandName: prospect.brandName, reason: "A contact with this email already exists" });
      continue;
    }
    seen.add(email);
    recipients.push(prospect);
  }

  return { recipients, skipped };
}

/**
 * Create CRM Contacts from eligible prospects (carrying over the prospect's town),
 * log an activity, and mark each prospect IMPORTED. Shared by import-to-crm and
 * import-to-campaign; the recipient set matches partitionEligibleForImport.
 */
async function importProspectsToContacts(
  app: FastifyInstance,
  prospects: Prospect[],
  opts: { productId: string | null; authorId?: string },
): Promise<ImportOutcome> {
  const { recipients, skipped } = await partitionEligibleForImport(app, prospects);
  const outcome: ImportOutcome = { imported: 0, contactIds: [], skipped };

  for (const prospect of recipients) {
    const contact = await app.prisma.contact.create({
      data: {
        firstName: "Clinic",
        lastName: prospect.brandName.slice(0, 120),
        company: prospect.brandName,
        empNumber: prospect.employeeCount ?? null,
        email: prospect.generalEmail!,
        phone: prospect.phone ?? null,
        website: prospect.website ?? null,
        industry: "Dental",
        country: "Hungary",
        city: prospect.city ?? null,
        notes: prospect.notes ?? null,
        status: "NEW",
        productId: opts.productId,
      },
    });

    await logActivity(app.prisma, {
      contactId: contact.id,
      type: "CONTACT_CREATED",
      description: `Contact created from prospect ${prospect.brandName}`,
      authorId: opts.authorId,
    });

    await app.prisma.prospect.update({
      where: { id: prospect.id },
      data: { status: "IMPORTED", importedContactId: contact.id },
    });

    outcome.imported++;
    outcome.contactIds.push(contact.id);
  }

  return outcome;
}

/** Default campaign name when the user doesn't supply one. */
function defaultCampaignName(productName: string, city: string | null): string {
  const monthYear = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
  return `${productName} — ${city ?? "All"} ${monthYear}`;
}

export async function prospectingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/prospects/discover", async (request, reply) => {
    const { query, city, districts, limit } = prospectDiscoverSchema.parse(request.body);
    const term = query?.trim() || "fogorvos";
    const town = city?.trim() || "Budapest";
    const max = limit ?? 20;

    // Districts (kerület) only exist in Budapest; ignore them for any other town.
    const isBudapest = /budapest/i.test(town);
    const queries =
      isBudapest && districts && districts.length > 0
        ? districts.map((d) => `${term} Budapest ${d}. kerület`)
        : [`${term} ${town}`];

    let discovered = 0;
    let created = 0;
    let skipped = 0;
    let simulated = false;

    for (const q of queries) {
      const { results, simulated: sim } = await discoverPlaces({ query: q, limit: max });
      simulated = simulated || sim;
      discovered += results.length;

      for (const r of results) {
        const existing = await app.prisma.prospect.findUnique({ where: { googlePlaceId: r.googlePlaceId } });
        if (existing) {
          skipped++;
          continue;
        }
        await app.prisma.prospect.create({
          data: {
            brandName: r.brandName,
            website: r.website ?? null,
            domain: domainOf(r.website),
            phone: r.phone ?? null,
            address: r.address ?? null,
            district: r.district ?? null,
            googlePlaceId: r.googlePlaceId,
            rating: r.rating ?? null,
            reviewCount: r.reviewCount ?? null,
            businessStatus: r.businessStatus ?? null,
            city: town,
            fitScore: calculateClinicSizeScore({ reviews: r.reviewCount }),
            source: "GOOGLE_PLACES",
            status: "NEW",
          },
        });
        created++;
      }
    }

    return reply.send({ discovered, created, skipped, simulated });
  });

  app.post("/api/prospects/enrich-queue", async (request, reply) => {
    const { ids, all } = prospectEnqueueSchema.parse(request.body);

    // Only enqueue prospects that have a website and are not already imported.
    const where = {
      website: { not: null },
      status: { notIn: ["IMPORTED" as const] },
      ...(all ? {} : { id: { in: ids ?? [] } }),
    };

    const result = await app.prisma.prospect.updateMany({
      where,
      data: {
        enrichQueuedAt: new Date(),
        enrichStartedAt: null,
        enrichAttempts: 0,
        enrichError: null,
      },
    });

    return reply.send({ queued: result.count });
  });

  app.get("/api/prospects/cities", async () => {
    const rows = await app.prisma.prospect.findMany({
      where: { city: { not: null } },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    });
    return rows.map((r) => r.city).filter((c): c is string => !!c);
  });

  app.get("/api/prospects", async (request) => {
    const { q, status, district, city, hasWebsite, hasEmail, page, pageSize } = prospectSearchSchema.parse(request.query);

    const where = {
      ...(status ? { status } : {}),
      ...(district ? { district } : {}),
      ...(city ? { city } : {}),
      ...(hasWebsite ? { website: { not: null } } : {}),
      ...(hasEmail ? { generalEmail: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { brandName: { contains: q, mode: "insensitive" as const } },
              { generalEmail: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      app.prisma.prospect.findMany({
        where,
        orderBy: [{ fitScore: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      app.prisma.prospect.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  app.get("/api/prospects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await app.prisma.prospect.findUnique({
      where: { id },
      include: { importedContact: true },
    });
    if (!prospect) return reply.code(404).send({ error: "Prospect not found" });
    return prospect;
  });

  app.patch("/api/prospects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = prospectUpdateSchema.parse(request.body);

    const before = await app.prisma.prospect.findUnique({ where: { id } });
    if (!before) return reply.code(404).send({ error: "Prospect not found" });

    const clean = {
      ...(data.brandName !== undefined ? { brandName: data.brandName } : {}),
      ...(data.legalName !== undefined ? { legalName: data.legalName || null } : {}),
      ...(data.website !== undefined ? { website: data.website || null, domain: domainOf(data.website) } : {}),
      ...(data.generalEmail !== undefined ? { generalEmail: data.generalEmail || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.district !== undefined ? { district: data.district || null } : {}),
      ...(data.dentistCount !== undefined ? { dentistCount: data.dentistCount } : {}),
      ...(data.locationCount !== undefined ? { locationCount: data.locationCount } : {}),
      ...(data.employeeCount !== undefined ? { employeeCount: data.employeeCount } : {}),
      ...(data.hasOnlineBooking !== undefined ? { hasOnlineBooking: data.hasOnlineBooking } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    };

    // Recompute fit score if any size signal changed.
    const merged = { ...before, ...clean };
    const fitScore = calculateClinicSizeScore({
      employees: merged.employeeCount,
      dentists: merged.dentistCount,
      locations: merged.locationCount,
      reviews: merged.reviewCount,
      hasOnlineBooking: merged.hasOnlineBooking,
    });

    const prospect = await app.prisma.prospect.update({
      where: { id },
      data: { ...clean, fitScore },
    });
    return prospect;
  });

  app.post("/api/prospects/:id/enrich", async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await app.prisma.prospect.findUnique({ where: { id } });
    if (!prospect) return reply.code(404).send({ error: "Prospect not found" });
    if (!prospect.website) return reply.code(400).send({ error: "Prospect has no website to enrich from" });

    let extraction;
    try {
      extraction = await enrichFromWebsite(prospect.brandName, prospect.website);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Enrichment failed" });
    }

    const fitScore = calculateClinicSizeScore({
      employees: extraction.employeeCount ?? prospect.employeeCount,
      dentists: extraction.dentistCount ?? prospect.dentistCount,
      locations: extraction.locationCount ?? prospect.locationCount,
      reviews: prospect.reviewCount,
      hasOnlineBooking: extraction.hasOnlineBooking,
    });

    const updated = await app.prisma.prospect.update({
      where: { id },
      data: {
        generalEmail: extraction.generalEmail ?? prospect.generalEmail,
        legalName: extraction.legalName ?? prospect.legalName,
        dentistCount: extraction.dentistCount ?? prospect.dentistCount,
        employeeCount: extraction.employeeCount ?? prospect.employeeCount,
        locationCount: extraction.locationCount ?? prospect.locationCount,
        hasOnlineBooking: extraction.hasOnlineBooking,
        fitScore,
        status: prospect.status === "NEW" ? "ENRICHED" : prospect.status,
        enrichedAt: new Date(),
      },
    });
    return updated;
  });

  app.post("/api/prospects/import-to-crm", async (request, reply) => {
    const { ids, all } = prospectImportSchema.parse(request.body);

    // Eligible = has an email and not already imported.
    const eligible = await app.prisma.prospect.findMany({
      where: {
        generalEmail: { not: null },
        importedContactId: null,
        ...(all ? {} : { id: { in: ids ?? [] } }),
      },
      orderBy: { fitScore: "desc" },
    });

    const product = await app.prisma.product.findUnique({ where: { slug: "sunshine-dental" } });
    const outcome = await importProspectsToContacts(app, eligible, {
      productId: product?.id ?? null,
      authorId: request.user?.id,
    });

    return reply.send({
      imported: outcome.imported,
      skipped: outcome.skipped.length,
      eligible: eligible.length,
      details: outcome.skipped,
    });
  });

  app.post("/api/prospects/import-to-campaign/preview", async (request, reply) => {
    const { ids, all, productId, city, campaignName } = prospectImportToCampaignSchema.parse(request.body);

    const product = await app.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return reply.code(400).send({ error: "Product not found" });

    const eligible = await app.prisma.prospect.findMany({
      where: {
        generalEmail: { not: null },
        importedContactId: null,
        ...(all ? {} : { id: { in: ids ?? [] } }),
      },
      orderBy: { fitScore: "desc" },
    });

    const { recipients, skipped } = await partitionEligibleForImport(app, eligible);
    const resolvedCity = city?.trim() || dominantCity(eligible);

    return reply.send({
      campaignName: campaignName?.trim() || defaultCampaignName(product.name, resolvedCity),
      city: resolvedCity,
      productName: product.name,
      count: recipients.length,
      recipients: recipients.map((p) => ({ brandName: p.brandName, email: p.generalEmail })),
      skipped,
    });
  });

  app.post("/api/prospects/import-to-campaign", async (request, reply) => {
    const { ids, all, productId, city, campaignName, templateId, launch } =
      prospectImportToCampaignSchema.parse(request.body);

    const product = await app.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return reply.code(400).send({ error: "Product not found" });

    if (templateId) {
      const template = await app.prisma.emailTemplate.findUnique({ where: { id: templateId } });
      if (!template) return reply.code(400).send({ error: "Template not found" });
    }

    const eligible = await app.prisma.prospect.findMany({
      where: {
        generalEmail: { not: null },
        importedContactId: null,
        ...(all ? {} : { id: { in: ids ?? [] } }),
      },
      orderBy: { fitScore: "desc" },
    });

    if (eligible.length === 0) {
      return reply.send({ imported: 0, skipped: 0, eligible: 0, enrolled: 0, campaignId: null, details: [] });
    }

    // Scope the campaign to the chosen town, or the batch's dominant town.
    const resolvedCity = city?.trim() || dominantCity(eligible);
    const name = campaignName?.trim() || defaultCampaignName(product.name, resolvedCity);

    const campaign = await app.prisma.campaign.create({
      data: {
        name,
        productId,
        city: resolvedCity,
        targetMarket: "Hungary",
        status: launch ? "ACTIVE" : "DRAFT",
      },
    });

    const outcome = await importProspectsToContacts(app, eligible, {
      productId,
      authorId: request.user?.id,
    });

    // Enroll = create PENDING outreach (the existing cron sends them). Only when launching;
    // a DRAFT campaign imports + creates the campaign but does not send yet.
    let enrolled = 0;
    if (launch && templateId && outcome.contactIds.length > 0) {
      const now = new Date();
      await app.prisma.outreach.createMany({
        data: outcome.contactIds.map((contactId) => ({
          contactId,
          campaignId: campaign.id,
          templateId,
          scheduledAt: now,
        })),
      });
      enrolled = outcome.contactIds.length;
    }

    return reply.code(201).send({
      imported: outcome.imported,
      skipped: outcome.skipped.length,
      eligible: eligible.length,
      enrolled,
      campaignId: campaign.id,
      campaignName: name,
      city: resolvedCity,
      status: campaign.status,
      details: outcome.skipped,
    });
  });

  app.post("/api/prospects/:id/import-to-crm", async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await app.prisma.prospect.findUnique({ where: { id } });
    if (!prospect) return reply.code(404).send({ error: "Prospect not found" });
    if (prospect.importedContactId) return reply.code(409).send({ error: "Prospect already imported" });
    if (!prospect.generalEmail) return reply.code(400).send({ error: "Prospect has no email; enrich or add one before importing" });

    const existing = await app.prisma.contact.findUnique({ where: { email: prospect.generalEmail } });
    if (existing) return reply.code(409).send({ error: "A contact with this email already exists" });

    const isSuppressed = await app.prisma.suppression.findUnique({
      where: { email: prospect.generalEmail.toLowerCase() },
    });
    if (isSuppressed) return reply.code(409).send({ error: "This email is on the suppression list (opted out)" });

    const product = await app.prisma.product.findUnique({ where: { slug: "sunshine-dental" } });

    const contact = await app.prisma.contact.create({
      data: {
        firstName: "Clinic",
        lastName: prospect.brandName.slice(0, 120),
        company: prospect.brandName,
        empNumber: prospect.employeeCount ?? null,
        email: prospect.generalEmail,
        phone: prospect.phone ?? null,
        website: prospect.website ?? null,
        industry: "Dental",
        country: "Hungary",
        city: prospect.city ?? null,
        notes: prospect.notes ?? null,
        status: "NEW",
        productId: product?.id ?? null,
      },
    });

    await logActivity(app.prisma, {
      contactId: contact.id,
      type: "CONTACT_CREATED",
      description: `Contact created from prospect ${prospect.brandName}`,
      authorId: request.user?.id,
    });

    const updated = await app.prisma.prospect.update({
      where: { id },
      data: { status: "IMPORTED", importedContactId: contact.id },
      include: { importedContact: true },
    });

    return reply.code(201).send(updated);
  });
}
