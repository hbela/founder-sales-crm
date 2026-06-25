import type { PrismaClient } from "@founder-crm/db";
import { enrichFromWebsite, isGlmConfigured } from "./prospect-enrich.js";
import { calculateClinicSizeScore } from "./prospect-score.js";

const MAX_ATTEMPTS = 3;
const STALE_MS = 5 * 60 * 1000; // re-pick a row whose run started but never finished

/** Process a single queued prospect: enrich from its website, update fields/score. */
async function processOne(prisma: PrismaClient, id: string): Promise<void> {
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p || !p.website) {
    await prisma.prospect.update({
      where: { id },
      data: { enrichQueuedAt: null, enrichStartedAt: null, enrichError: "No website to enrich from" },
    });
    return;
  }

  await prisma.prospect.update({
    where: { id },
    data: { enrichStartedAt: new Date(), enrichAttempts: { increment: 1 } },
  });

  try {
    const extraction = await enrichFromWebsite(p.brandName, p.website);
    const fitScore = calculateClinicSizeScore({
      employees: extraction.employeeCount ?? p.employeeCount,
      dentists: extraction.dentistCount ?? p.dentistCount,
      locations: extraction.locationCount ?? p.locationCount,
      reviews: p.reviewCount,
      hasOnlineBooking: extraction.hasOnlineBooking,
    });

    await prisma.prospect.update({
      where: { id },
      data: {
        generalEmail: extraction.generalEmail ?? p.generalEmail,
        legalName: extraction.legalName ?? p.legalName,
        dentistCount: extraction.dentistCount ?? p.dentistCount,
        employeeCount: extraction.employeeCount ?? p.employeeCount,
        locationCount: extraction.locationCount ?? p.locationCount,
        hasOnlineBooking: extraction.hasOnlineBooking,
        fitScore,
        status: p.status === "NEW" ? "ENRICHED" : p.status,
        enrichedAt: new Date(),
        enrichQueuedAt: null,
        enrichStartedAt: null,
        enrichError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = p.enrichAttempts + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    await prisma.prospect.update({
      where: { id },
      data: {
        enrichError: message,
        enrichStartedAt: null,
        // Give up after MAX_ATTEMPTS: dequeue and flag for human review.
        ...(giveUp ? { enrichQueuedAt: null, status: p.status === "NEW" ? "NEEDS_REVIEW" : p.status } : {}),
      },
    });
  }
}

/**
 * Drain a batch of the prospect enrichment queue. Returns the number processed.
 * Skips entirely when GLM is not configured so rows stay queued until a key is set.
 */
export async function processEnrichmentQueue(prisma: PrismaClient, batchSize = 5): Promise<number> {
  if (!isGlmConfigured()) return 0;

  const staleBefore = new Date(Date.now() - STALE_MS);
  const due = await prisma.prospect.findMany({
    where: {
      enrichQueuedAt: { not: null },
      enrichAttempts: { lt: MAX_ATTEMPTS },
      website: { not: null },
      OR: [{ enrichStartedAt: null }, { enrichStartedAt: { lt: staleBefore } }],
    },
    orderBy: { enrichQueuedAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  for (const row of due) {
    await processOne(prisma, row.id);
  }
  return due.length;
}
