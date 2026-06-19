import type { FastifyInstance } from "fastify";
import { templateCreateSchema, templateUpdateSchema, templatePreviewSchema } from "@founder-crm/types";
import { renderTemplate } from "../../lib/template.js";

export async function templateRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/templates", async (request) => {
    const { productId } = request.query as { productId?: string };
    return app.prisma.emailTemplate.findMany({
      where: productId ? { productId } : {},
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/api/templates", async (request, reply) => {
    const data = templateCreateSchema.parse(request.body);
    const template = await app.prisma.emailTemplate.create({
      data: { ...data, productId: data.productId || null },
      include: { product: true },
    });
    return reply.code(201).send(template);
  });

  app.get("/api/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await app.prisma.emailTemplate.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!template) return reply.code(404).send({ error: "Template not found" });
    return template;
  });

  app.patch("/api/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = templateUpdateSchema.parse(request.body);
    const template = await app.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...data,
        ...(data.productId !== undefined ? { productId: data.productId || null } : {}),
      },
      include: { product: true },
    });
    return template;
  });

  app.delete("/api/templates/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.emailTemplate.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.post("/api/templates/preview", async (request, reply) => {
    const { templateId, contactId } = templatePreviewSchema.parse(request.body);
    const template = await app.prisma.emailTemplate.findUnique({ where: { id: templateId }, include: { product: true } });
    if (!template) return reply.code(404).send({ error: "Template not found" });
    const contact = await app.prisma.contact.findUnique({ where: { id: contactId }, include: { product: true } });
    if (!contact) return reply.code(404).send({ error: "Contact not found" });

    const product = template.product ?? contact.product;
    return {
      subject: renderTemplate(template.subject, { contact, product }),
      body: renderTemplate(template.body, { contact, product }),
    };
  });
}
