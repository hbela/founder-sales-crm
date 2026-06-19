import type { FastifyInstance } from "fastify";
import { productCreateSchema, productUpdateSchema } from "@founder-crm/types";

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/products", async () => {
    return app.prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  });

  app.post("/api/products", async (request, reply) => {
    const data = productCreateSchema.parse(request.body);
    const product = await app.prisma.product.create({ data });
    return reply.code(201).send(product);
  });

  app.get("/api/products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await app.prisma.product.findUnique({ where: { id } });
    if (!product) return reply.code(404).send({ error: "Product not found" });
    return product;
  });

  app.patch("/api/products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = productUpdateSchema.parse(request.body);
    const product = await app.prisma.product.update({ where: { id }, data });
    return product;
  });

  app.delete("/api/products/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.product.delete({ where: { id } });
    return reply.code(204).send();
  });
}
