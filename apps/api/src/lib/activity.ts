import type { PrismaClient, Prisma, ActivityType } from "@founder-crm/db";

export async function logActivity(
  prisma: PrismaClient,
  data: {
    contactId: string;
    type: ActivityType;
    description: string;
    authorId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return prisma.activity.create({
    data: {
      contactId: data.contactId,
      type: data.type,
      description: data.description,
      authorId: data.authorId ?? null,
      ...(data.metadata ? { metadata: data.metadata as Prisma.InputJsonValue } : {}),
    },
  });
}
