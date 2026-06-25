import type { PrismaClient } from "@founder-crm/db";
import { sendEmail, bodyToHtml } from "./email.js";
import { renderTemplate } from "./template.js";
import { logActivity } from "./activity.js";
import { env } from "../env.js";

export async function processOutreachItem(
  prisma: PrismaClient,
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  const item = await prisma.outreach.findUnique({
    where: { id: itemId },
    include: { contact: { include: { product: true } }, template: { include: { product: true } }, campaign: true },
  });

  if (!item) return { success: false, error: "Outreach item not found" };
  if (item.status === "SENT") return { success: true };

  // Suppression guard: never send to an unsubscribed contact or a suppressed email.
  const suppressed =
    item.contact.unsubscribedAt != null ||
    (await prisma.suppression.findUnique({ where: { email: item.contact.email } })) != null;
  if (suppressed) {
    await prisma.outreach.update({
      where: { id: itemId },
      data: { status: "FAILED", errorMessage: "Suppressed: recipient unsubscribed or bounced", sentAt: null },
    });
    await logActivity(prisma, {
      contactId: item.contactId,
      type: "NOTE_ADDED",
      description: "Send skipped — recipient is on the suppression list",
    });
    return { success: false, error: "suppressed" };
  }

  await prisma.outreach.update({ where: { id: itemId }, data: { status: "SENDING" } });

  const product = item.template.product ?? item.contact.product;
  const subject = renderTemplate(item.template.subject, { contact: item.contact, product });
  const body = renderTemplate(item.template.body, { contact: item.contact, product });

  const result = await sendEmail({
    to: item.contact.email,
    subject,
    html: bodyToHtml(body),
    // Thread replies into the Workspace mailbox that n8n watches (falls back to
    // Resend's From address when REPLY_TO_EMAIL is unset).
    replyTo: env.replyToEmail || undefined,
  });

  if (!result.success) {
    await prisma.outreach.update({
      where: { id: itemId },
      data: { status: "FAILED", errorMessage: result.error ?? "Unknown error" },
    });
    return { success: false, error: result.error };
  }

  await prisma.outreach.update({
    where: { id: itemId },
    data: { status: "SENT", sentAt: new Date(), errorMessage: null },
  });

  await logActivity(prisma, {
    contactId: item.contactId,
    type: "EMAIL_SENT",
    description: `Email sent: "${subject}"`,
    metadata: { outreachId: itemId, campaignId: item.campaignId, templateId: item.templateId, simulated: result.simulated },
  });

  // Advance contact status if still NEW.
  if (item.contact.status === "NEW") {
    await prisma.contact.update({ where: { id: item.contactId }, data: { status: "CONTACTED" } });
  }

  return { success: true };
}

export async function processPendingOutreach(prisma: PrismaClient, batchSize = 50): Promise<number> {
  const due = await prisma.outreach.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() } },
    take: batchSize,
    orderBy: { scheduledAt: "asc" },
  });

  let sent = 0;
  for (const item of due) {
    const result = await processOutreachItem(prisma, item.id);
    if (result.success) sent++;
  }
  return sent;
}
