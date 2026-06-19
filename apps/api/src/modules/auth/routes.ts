import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "@founder-crm/types";
import { hashPassword, setSessionCookie, clearSessionCookie, verifyPassword } from "../../lib/auth.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // First-run registration: only allowed when no users exist yet.
  app.post("/api/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input", issues: parsed.error.issues });
    }

    const userCount = await app.prisma.user.count();
    if (userCount > 0) {
      return reply.code(409).send({ error: "Registration is closed. Ask an admin for an account." });
    }

    const { name, email, password } = parsed.data;
    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const user = await app.prisma.user.create({
      data: { name, email, password: await hashPassword(password), role: "ADMIN" },
    });
    setSessionCookie(reply, user.id);
    return reply.code(201).send({ user: sanitize(user) });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input", issues: parsed.error.issues });
    }

    const { email, password } = parsed.data;
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    setSessionCookie(reply, user.id);
    return reply.send({ user: sanitize(user) });
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/api/auth/me", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ user: null });
    }
    return reply.send({ user: sanitize(request.user) });
  });
}

function sanitize(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
