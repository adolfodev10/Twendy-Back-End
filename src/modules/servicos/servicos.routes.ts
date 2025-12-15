import { FastifyInstance } from "fastify";
import { prisma } from "../../config/prisma";
import { authMiddleware } from "../../middlewares/auth.middleware";

export default async function servicoRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: authMiddleware }, async (req) => {
    const { id_funcionario, descri } = req.body as any;

    return prisma.servico.create({
      data: { id_funcionario, descri }
    });
  });

  app.get("/", async () => {
    return prisma.servico.findMany({
      include: { funcionario: true }
    });
  });
}
