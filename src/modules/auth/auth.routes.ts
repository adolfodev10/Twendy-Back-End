import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../config/prisma";

// Interface para o usuário no JWT
interface UserPayload {
  id: number;
  email: string;
  nome: string;
  BI: string;
}

export default async function authRoutes(app: FastifyInstance) {
  // Rota de registro (sem senha, já que o modelo não tem)
  app.post("/register", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { nome, email, BI } = req.body as any;

      // Verificar se o usuário já existe pelo email
      const existingUserByEmail = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        return reply.status(400).send({ message: "Email já está em uso" });
      }

      // Verificar se o BI já existe
      const existingUserByBI = await prisma.usuario.findUnique({
        where: { BI },
      });

      if (existingUserByBI) {
        return reply.status(400).send({ message: "BI já está em uso" });
      }

      // Criar usuário sem senha
      const user = await prisma.usuario.create({
        data: {
          nome,
          email,
          BI,
          role: "CLIENTE" 
        },
      });

      reply.status(201).send({
        message: "Usuário registrado com sucesso",
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email,
          BI: user.BI
        }
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      reply.status(500).send({ message: "Erro ao registrar usuário" });
    }
  });

  // Rota de login SIMPLIFICADA - sem verificação de senha
  app.post("/login", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, BI } = req.body as any;

      // Buscar usuário pelo email OU BI (escolha um ou ambos)
      let user = null;
      
      if (email) {
        user = await prisma.usuario.findUnique({
          where: { email },
        });
      } else if (BI) {
        user = await prisma.usuario.findUnique({
          where: { BI },
        });
      }

      // Verificar se usuário existe
      if (!user) {
        return reply.status(401).send({ 
          message: "Usuário não encontrado",
          suggestion: "Verifique o email ou BI informado"
        });
      }

      // Gerar token JWT
      const token = app.jwt.sign({
        id: user.id_usuario,
        email: user.email,
        nome: user.nome,
        BI: user.BI
      });

      reply.send({
        message: "Login realizado com sucesso",
        token,
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email,
          BI: user.BI
        }
      });
    } catch (error) {
      console.error("Erro no login:", error);
      reply.status(500).send({ message: "Erro ao realizar login" });
    }
  });

  // Função de autenticação
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: "Token inválido ou expirado" });
    }
  };

  // Rota para verificar token
  app.get("/me", { onRequest: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userPayload = req.user as UserPayload;
      
      const user = await prisma.usuario.findUnique({
        where: { id_usuario: userPayload.id },
        select: {
          id_usuario: true,
          nome: true,
          email: true,
          BI: true,
          funcionarios: {
            select: {
              id_funcionario: true,
              telefone: true,
              cargo: true,
              salario: true
            }
          },
          enviadas: {
            select: {
              id_comunicacao: true,
              tipo: true,
              assunto: true,
              data_envio: true
            },
            take: 10,
            orderBy: {
              data_envio: 'desc'
            }
          },
          recebidas: {
            select: {
              id_comunicacao: true,
              tipo: true,
              assunto: true,
              data_envio: true
            },
            take: 10,
            orderBy: {
              data_envio: 'desc'
            }
          }
        }
      });

      if (!user) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      reply.send({ user });
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      reply.status(500).send({ message: "Erro ao buscar informações do usuário" });
    }
  });

  // Rota para logout (apenas invalidar token no frontend)
  app.post("/logout", { onRequest: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: "Logout realizado com sucesso" });
  });

  // Rota para renovar token
  app.post("/refresh", { onRequest: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userPayload = req.user as UserPayload;
      
      const user = await prisma.usuario.findUnique({
        where: { id_usuario: userPayload.id },
        select: {
          id_usuario: true,
          nome: true,
          email: true,
          BI: true
        }
      });

      if (!user) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      // Gerar novo token
      const newToken = app.jwt.sign({
        id: user.id_usuario,
        email: user.email,
        nome: user.nome,
        BI: user.BI
      });

      reply.send({
        message: "Token renovado com sucesso",
        token: newToken,
        user
      });
    } catch (error) {
      console.error("Erro ao renovar token:", error);
      reply.status(500).send({ message: "Erro ao renovar token" });
    }
  });
}