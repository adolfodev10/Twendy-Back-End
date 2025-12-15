import { FastifyInstance } from "fastify";
import { prisma } from "../../config/prisma";
import { hashPassword, comparePassword } from "../../utils/hash";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const { nome, email, BI, enviadas, funcionarios, id_usuario, recebidas } = req.body as any;

    const user = await prisma.usuario.create({
      data: {
        nome,
        email,
        BI,
        enviadas,
        funcionarios,
        id_usuario,
        recebidas
      },
    });

    reply.send(user);
  });

  app.post("/login", async (req, reply) => {
    const { email, senha } = req.body as any;

    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user || !(await comparePassword(email, user.email))) {
      return reply.status(401).send({ message: "Credenciais inválidas" });
    }

    const token = app.jwt.sign({
      id: user.id_usuario,
    });

    reply.send({ token, user });
  });
}
