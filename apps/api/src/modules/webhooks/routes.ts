import type { FastifyInstance } from "fastify";
import { logActivity } from "../../lib/activity.js";

interface ResendEvent {
  type?: string;
  data?: { email?: string; tag?: string; messageId?: string };
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
      const contact = await app.prisma.contact.findFirst({ where: { email } });
      if (!contact) continue;

      if (type === "email.bounced" || type === "email.delivery_failed") {
        await logActivity(app.prisma, {
          contactId: contact.id,
          type: "NOTE_ADDED",
          description: `Email bounced: ${email}`,
          metadata: { event: type, messageId: ev.data?.messageId },
        });
      }

      // Custom reply event (e.g. from inbound forwarding). Marks contact REPLIED.
      if (type === "reply" || type === "email.replied") {
        await app.prisma.contact.update({
          where: { id: contact.id },
          data: { status: contact.status === "NEW" ? "REPLIED" : contact.status },
        });
        await logActivity(app.prisma, {
          contactId: contact.id,
          type: "REPLY_RECEIVED",
          description: `Reply received from ${email}`,
          metadata: { event: type },
        });
      }
    }

    return reply.send({ ok: true });
  });
}
