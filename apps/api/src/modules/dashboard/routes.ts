import type { FastifyInstance } from "fastify";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/dashboard", async () => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [
      totalContacts,
      emailsSent,
      replies,
      meetingsBooked,
      customers,
      contacted,
      followupsDueToday,
      activeCampaigns,
      recentReplies,
    ] = await Promise.all([
      app.prisma.contact.count(),
      app.prisma.outreach.count({ where: { status: "SENT" } }),
      app.prisma.contact.count({ where: { status: { in: ["REPLIED", "INTERESTED", "MEETING_BOOKED", "CUSTOMER"] } } }),
      app.prisma.contact.count({ where: { status: { in: ["MEETING_BOOKED", "CUSTOMER"] } } }),
      app.prisma.contact.count({ where: { status: "CUSTOMER" } }),
      app.prisma.contact.count({ where: { status: { not: "NEW" } } }),
      app.prisma.followUp.count({ where: { status: "PENDING", dueDate: { lte: endOfToday } } }),
      app.prisma.campaign.count({ where: { status: "ACTIVE" } }),
      app.prisma.contact.findMany({
        where: { status: "REPLIED" },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { product: true },
      }),
    ]);

    const replyRate = emailsSent > 0 ? (replies / emailsSent) * 100 : 0;
    const conversionRate = contacted > 0 ? (customers / contacted) * 100 : 0;

    const pipeline = await app.prisma.contact.groupBy({
      by: ["status"],
      _count: true,
    });

    return {
      totalContacts,
      emailsSent,
      replies,
      meetingsBooked,
      customers,
      replyRate: Math.round(replyRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      followupsDueToday,
      activeCampaigns,
      recentReplies,
      pipeline: pipeline.map((p) => ({ status: p.status, count: p._count })),
    };
  });
}
