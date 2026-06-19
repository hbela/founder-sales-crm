import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export async function errorPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((err: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation failed",
        issues: err.issues,
      });
    }

    if (err.validation) {
      return reply.code(400).send({ error: "Validation failed", details: err.message });
    }

    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      app.log.error(err);
    }
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal server error" : err.message,
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: "Not found" });
  });
}
