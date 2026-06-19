import type { FastifyInstance } from "fastify";
import { contactCreateSchema, contactUpdateSchema, contactSearchSchema, noteCreateSchema } from "@founder-crm/types";
import { logActivity } from "../../lib/activity.js";

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/contacts", async (request) => {
    const parsed = contactSearchSchema.parse(request.query);
    const { q, status, productId, page, pageSize } = parsed;

    const where = {
      ...(status ? { status } : {}),
      ...(productId ? { productId } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { company: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      app.prisma.contact.findMany({
        where,
        include: { product: true },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      app.prisma.contact.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  app.post("/api/contacts", async (request, reply) => {
    const data = contactCreateSchema.parse(request.body);
    const clean = {
      ...data,
      productId: data.productId || null,
      company: data.company || null,
      phone: data.phone || null,
      website: data.website || null,
      industry: data.industry || null,
      country: data.country || null,
      notes: data.notes || null,
    };
    const contact = await app.prisma.contact.create({ data: clean, include: { product: true } });
    await logActivity(app.prisma, {
      contactId: contact.id,
      type: "CONTACT_CREATED",
      description: `Contact ${contact.firstName} ${contact.lastName} created`,
      authorId: request.user?.id,
    });
    return reply.code(201).send(contact);
  });

  app.get("/api/contacts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const contact = await app.prisma.contact.findUnique({
      where: { id },
      include: {
        product: true,
        activities: { orderBy: { createdAt: "desc" }, take: 100 },
        followups: { orderBy: { dueDate: "asc" } },
        outreach: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { campaign: true, template: true },
        },
      },
    });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });
    return contact;
  });

  app.patch("/api/contacts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = contactUpdateSchema.parse(request.body);
    const clean = {
      ...data,
      ...(data.productId !== undefined ? { productId: data.productId || null } : {}),
      ...(data.company !== undefined ? { company: data.company || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.website !== undefined ? { website: data.website || null } : {}),
      ...(data.industry !== undefined ? { industry: data.industry || null } : {}),
      ...(data.country !== undefined ? { country: data.country || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    };

    const before = await app.prisma.contact.findUnique({ where: { id } });
    if (!before) return reply.code(404).send({ error: "Contact not found" });

    const contact = await app.prisma.contact.update({
      where: { id },
      data: clean,
      include: { product: true },
    });

    if (data.status && data.status !== before.status) {
      await logActivity(app.prisma, {
        contactId: id,
        type: "STATUS_CHANGED",
        description: `Status changed from ${before.status} to ${data.status}`,
        authorId: request.user?.id,
        metadata: { from: before.status, to: data.status },
      });
    } else {
      await logActivity(app.prisma, {
        contactId: id,
        type: "CONTACT_UPDATED",
        description: `Contact updated`,
        authorId: request.user?.id,
      });
    }

    return contact;
  });

  app.delete("/api/contacts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.contact.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.post("/api/contacts/:id/notes", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { note } = noteCreateSchema.parse(request.body);
    const contact = await app.prisma.contact.findUnique({ where: { id } });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });

    await logActivity(app.prisma, {
      contactId: id,
      type: "NOTE_ADDED",
      description: note,
      authorId: request.user?.id,
    });

    const updated = await app.prisma.contact.update({
      where: { id },
      data: { notes: contact.notes ? `${contact.notes}\n\n${note}` : note },
    });
    return updated;
  });
}
