import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { logActivity } from "../../lib/activity.js";
import { env } from "../../env.js";

interface ResendEvent {
  type?: string;
  data?: { email?: string; tag?: string; messageId?: string };
}

/**
 * Add an email to the permanent suppression list and stop any queued sends.
 * Idempotent: safe to call repeatedly for the same address.
 */
async function suppressEmail(app: FastifyInstance, rawEmail: string, reason: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return;

  await app.prisma.suppression.upsert({
    where: { email },
    update: { reason },
    create: { email, reason },
  });

  const contact = await app.prisma.contact.findUnique({ where: { email } });
  if (!contact) return;

  if (!contact.unsubscribedAt) {
    await app.prisma.contact.update({ where: { id: contact.id }, data: { unsubscribedAt: new Date() } });
  }
  // Phase-1 "stop the sequence": cancel queued sends for this contact.
  await app.prisma.outreach.updateMany({
    where: { contactId: contact.id, status: "PENDING" },
    data: { status: "FAILED", errorMessage: `Canceled: recipient ${reason}` },
  });
  await logActivity(app.prisma, {
    contactId: contact.id,
    type: "NOTE_ADDED",
    description: `Added to suppression list (${reason})`,
    metadata: { reason },
  });
}

/**
 * Advance a contact to REPLIED when a human reply is detected.
 *
 * Only promotes from the early stages (NEW or CONTACTED) — the first send already
 * moves a contact to CONTACTED, so a reply must be able to advance from there. It
 * never downgrades a contact that has progressed further (INTERESTED / MEETING_BOOKED
 * / CUSTOMER / LOST). Always logs a REPLY_RECEIVED activity when the contact is found.
 *
 * Returns true when a matching contact existed.
 */
async function markReplied(
  app: FastifyInstance,
  rawEmail: string,
  meta: { subject?: string; receivedAt?: string; event?: string },
): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return false;

  // Contacts may be stored with the email's original casing; match case-insensitively
  // so a mixed-case sender address from Gmail still resolves.
  const contact = await app.prisma.contact.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!contact) return false;

  if (contact.status === "NEW" || contact.status === "CONTACTED") {
    await app.prisma.contact.update({
      where: { id: contact.id },
      data: { status: "REPLIED" },
    });
  }

  await logActivity(app.prisma, {
    contactId: contact.id,
    type: "REPLY_RECEIVED",
    description: meta.subject
      ? `Reply received from ${email}: ${meta.subject}`
      : `Reply received from ${email}`,
    metadata: {
      ...(meta.event ? { event: meta.event } : {}),
      ...(meta.subject ? { subject: meta.subject } : {}),
      ...(meta.receivedAt ? { receivedAt: meta.receivedAt } : {}),
    },
  });
  return true;
}

/** Require the shared secret when one is configured; allow unauthenticated calls in local dev. */
function hasValidSecret(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!env.n8nWebhookSecret) return true; // dev convenience when no secret is set
  if (request.headers["x-webhook-secret"] === env.n8nWebhookSecret) return true;
  void reply.code(401).send({ error: "Invalid or missing webhook secret" });
  return false;
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Resend webhook receiver. Unauthenticated (verify signature in production).
  app.post("/api/webhooks/resend", async (request, reply) => {
    const event = request.body as ResendEvent | ResendEvent[];
    const events = Array.isArray(event) ? event : [event];

    for (const ev of events) {
      const type = ev.type ?? "";
      const email = ev.data?.email;
      if (!email) continue;

      // A bounce / delivery failure permanently suppresses the address.
      if (type === "email.bounced" || type === "email.delivery_failed") {
        await suppressEmail(app, email, "bounce");
        continue;
      }

      // Custom reply event (e.g. from inbound forwarding). Marks contact REPLIED.
      if (type === "reply" || type === "email.replied") {
        await markReplied(app, email, { event: type });
      }
    }

    return reply.send({ ok: true });
  });

  // Reply receiver, called by n8n when it detects a campaign reply in the watched
  // Gmail inbox. Clearer contract than overloading the Resend route.
  // Secret-protected (x-webhook-secret) when N8N_WEBHOOK_SECRET is configured.
  app.post("/api/webhooks/reply", async (request, reply) => {
    if (!hasValidSecret(request, reply)) return;

    const { email, subject, receivedAt } =
      (request.body as { email?: string; subject?: string; receivedAt?: string }) ?? {};
    if (!email || typeof email !== "string") {
      return reply.code(400).send({ error: "email is required" });
    }

    const matched = await markReplied(app, email, { subject, receivedAt, event: "reply" });
    return reply.send({ ok: true, matched, email: email.trim().toLowerCase() });
  });

  // Opt-out receiver, called by n8n when it detects an "unsubscribe" reply in the inbox.
  // Secret-protected (x-webhook-secret) when N8N_WEBHOOK_SECRET is configured.
  app.post("/api/webhooks/unsubscribe", async (request, reply) => {
    if (!hasValidSecret(request, reply)) return;

    const { email } = (request.body as { email?: string }) ?? {};
    if (!email || typeof email !== "string") {
      return reply.code(400).send({ error: "email is required" });
    }

    await suppressEmail(app, email, "unsubscribe");
    return reply.send({ ok: true, suppressed: email.trim().toLowerCase() });
  });
}
