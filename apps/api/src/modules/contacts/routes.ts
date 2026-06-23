import type { FastifyInstance } from "fastify";
import {
  contactCreateSchema,
  contactUpdateSchema,
  contactSearchSchema,
  contactImportSchema,
  contactImportRowSchema,
  noteCreateSchema,
} from "@founder-crm/types";
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
      empNumber: data.empNumber ?? null,
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

  app.post("/api/contacts/import", async (request, reply) => {
    const { rows, productId } = contactImportSchema.parse(request.body);

    // Resolve the target product: explicit productId, else the seeded Sunshine Dental.
    const product = productId
      ? await app.prisma.product.findUnique({ where: { id: productId } })
      : await app.prisma.product.findUnique({ where: { slug: "sunshine-dental" } });
    if (!product) {
      return reply.code(400).send({ error: "Target product not found" });
    }

    const errors: { row: number; email?: string; message: string }[] = [];
    const valid: { row: number; data: ReturnType<typeof contactImportRowSchema.parse> }[] = [];
    const seen = new Set<string>();

    rows.forEach((raw, i) => {
      const rowNum = i + 1;
      const parsed = contactImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push({
          row: rowNum,
          email: typeof raw.email === "string" ? raw.email : undefined,
          message: parsed.error.issues.map((e) => `${e.path.join(".") || "row"}: ${e.message}`).join("; "),
        });
        return;
      }
      const email = parsed.data.email;
      if (seen.has(email)) {
        errors.push({ row: rowNum, email, message: "Duplicate email within file" });
        return;
      }
      seen.add(email);
      valid.push({ row: rowNum, data: parsed.data });
    });

    // Skip rows whose email already exists in the database.
    const existing = valid.length
      ? await app.prisma.contact.findMany({
          where: { email: { in: valid.map((v) => v.data.email) } },
          select: { email: true },
        })
      : [];
    const existingEmails = new Set(existing.map((e) => e.email));

    const toCreate = valid.filter((v) => !existingEmails.has(v.data.email));
    const skipped = valid.length - toCreate.length;

    const created = await app.prisma.$transaction(
      toCreate.map((v) =>
        app.prisma.contact.create({
          data: {
            firstName: v.data.firstName,
            lastName: v.data.lastName,
            company: v.data.company || null,
            empNumber: v.data.empNumber ?? null,
            email: v.data.email,
            phone: v.data.phone || null,
            website: v.data.website || null,
            industry: v.data.industry || null,
            country: v.data.country || null,
            notes: v.data.notes || null,
            status: "NEW",
            productId: product.id,
          },
        }),
      ),
    );

    await Promise.all(
      created.map((c) =>
        logActivity(app.prisma, {
          contactId: c.id,
          type: "CONTACT_CREATED",
          description: `Contact ${c.firstName} ${c.lastName} imported from CSV`,
          authorId: request.user?.id,
        }),
      ),
    );

    return reply.code(201).send({ created: created.length, skipped, errors });
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
      ...(data.empNumber !== undefined ? { empNumber: data.empNumber } : {}),
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
