import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../config/prisma";
import { sendResetCodeEmail } from "../servicos/nodemailer";
import { hashPassword } from "../../utils/hash";
import { OAuth2Client } from "google-auth-library";

// Interface para o usuário no JWT
interface UserPayload {
  id: number;
  email: string;
  nome: string;
  BI: string;
}

let googleOAuthClient: OAuth2Client | null = null;


function initGoogleOAuth() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  
  if (!CLIENT_ID) {
    console.warn('⚠️  GOOGLE_CLIENT_ID não definido no ambiente. Login Google desabilitado.');
    console.warn('ℹ️  Adicione GOOGLE_CLIENT_ID ao seu arquivo .env');
    return null;
  }
  
  console.log('✅ Google OAuth2 client inicializado com sucesso');
  return new OAuth2Client(CLIENT_ID);
}

export default async function authRoutes(app: FastifyInstance) {

  // Atualize a rota /google no backend
app.post("/google", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    console.log("=== 🔐 INÍCIO AUTENTICAÇÃO GOOGLE ===");
    
    // 1. EXTRAIR O TOKEN
    const body = req.body as any;
    console.log("📦 Body recebido. Campos:", Object.keys(body));
    
    const token = body.token || body.credential || body.tokenId || body.id_token;
    console.log("🔑 Token extraído:", token ? "EXISTE" : "NÃO EXISTE");
    
    if (!token) {
      console.error("❌ Token não encontrado no request");
      return reply.status(400).send({ 
        success: false,
        message: "Token não fornecido",
        hint: "Envie como: { token: 'seu_token_aqui' }",
        receivedFields: Object.keys(body)
      });
    }
    
    console.log("📏 Comprimento do token:", token.length);
    console.log("🔤 Primeiros 30 chars:", token.substring(0, 30) + "...");
    
    // 2. VERIFICAR/CONFIGURAR CLIENTE GOOGLE
    if (!googleOAuthClient) {
      console.log("🔄 Criando cliente OAuth2...");
      const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
      
      if (!CLIENT_ID) {
        console.error("❌ GOOGLE_CLIENT_ID não definido no .env");
        return reply.status(500).send({ 
          success: false,
          message: "Configuração do servidor incompleta"
        });
      }
      
      console.log("✅ Client ID encontrado:", CLIENT_ID.substring(0, 30) + "...");
      googleOAuthClient = new OAuth2Client(CLIENT_ID);
      console.log("✅ Cliente OAuth2 inicializado");
    }
    
    // 3. VERIFICAR TOKEN COM GOOGLE
    console.log("🔍 Iniciando verificação do token...");
    console.log("🎯 Audience (Client ID):", process.env.GOOGLE_CLIENT_ID);
    
    let ticket;
    try {
      ticket = await googleOAuthClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      console.log("✅ Token verificado com sucesso pelo Google");
    } catch (googleError: any) {
      console.error("❌ ERRO NA VERIFICAÇÃO DO TOKEN:");
      console.error("   Mensagem:", googleError.message);
      console.error("   Tipo:", googleError.constructor.name);
      
      // Erros comuns do Google
      if (googleError.message.includes('Wrong number of segments')) {
        console.error("   ❌ Token malformado (formato JWT inválido)");
      } else if (googleError.message.includes('Token used too late')) {
        console.error("   ❌ Token expirado");
      } else if (googleError.message.includes('Invalid token signature')) {
        console.error("   ❌ Assinatura inválida");
      } else if (googleError.message.includes('Audience mismatch')) {
        console.error("   ❌ Client ID incorreto");
      }
      
      return reply.status(400).send({ 
        success: false,
        message: "Token Google inválido",
        error: googleError.message,
        hint: "Verifique: 1) Token correto 2) Client ID correto 3) Token não expirado"
      });
    }
    
    // 4. EXTRAIR DADOS DO PAYLOAD
    const payload = ticket.getPayload();
    
    if (!payload) {
      console.error("❌ Payload do token vazio");
      return reply.status(400).send({ 
        success: false,
        message: "Token Google sem dados"
      });
    }
    
    if (!payload.email) {
      console.error("❌ Token não contém email");
      return reply.status(400).send({ 
        success: false,
        message: "Token Google sem email"
      });
    }
    
    console.log("✅ Dados extraídos do token:");
    console.log("   📧 Email:", payload.email);
    console.log("   👤 Nome:", payload.name || "Não informado");
    console.log("   🆔 Google ID:", payload.sub);
    console.log("   ✅ Email verificado:", payload.email_verified);
    console.log("   🖼️  Foto:", payload.picture || "Não tem");
    
    // 5. VERIFICAR/CRIAR USUÁRIO NO BANCO
    console.log("🔍 Buscando usuário no banco...");
    let user = await prisma.usuario.findUnique({
      where: { email: payload.email },
    });
    
    if (!user) {
      console.log("👤 Criando novo usuário...");
      
      // Preparar dados para criação
      const userData: any = {
        nome: payload.name || "Usuário Google",
        email: payload.email,
        BI: `GOOGLE_${payload.sub}`,
        role: "CLIENTE"
      };
      
      // Adicionar googleId se a coluna existir
      try {
        // Verifica se o modelo Prisma tem campo googleId
        userData.googleId = payload.sub;
      } catch (error) {
        console.log("ℹ️  Coluna googleId não disponível");
      }
      
      user = await prisma.usuario.create({
        data: userData,
      });
      
      console.log("✅ Usuário criado:", user.nome, "(ID:", user.id_usuario + ")");
    } else {
      console.log("✅ Usuário existente:", user.nome, "(ID:", user.id_usuario + ")");
      
      // Atualizar googleId se necessário
      if (user.googleId !== payload.sub) {
        console.log("🔄 Atualizando googleId...");
        await prisma.usuario.update({
          where: { id_usuario: user.id_usuario },
          data: { googleId: payload.sub }
        }).catch(err => {
          console.log("ℹ️  Não foi possível atualizar googleId:", err.message);
        });
      }
    }
    
    // 6. GERAR JWT
    console.log("🔑 Gerando token JWT...");
    const jwtToken = app.jwt.sign({
      id: user.id_usuario,
      email: user.email,
      nome: user.nome,
      BI: user.BI,
      role: user.role,
      googleId: payload.sub
    }, {
      expiresIn: "7d"
    });
    
    console.log("✅ Token JWT gerado");
    console.log("🎯 Role do usuário:", user.role);
    
    // 7. ENVIAR RESPOSTA
    console.log("📤 Enviando resposta ao frontend...");
    reply.send({
      success: true,
      message: "Login com Google realizado com sucesso",
      token: jwtToken,
      user: {
        id_usuario: user.id_usuario,
        nome: user.nome,
        email: user.email,
        BI: user.BI,
        role: user.role,
        googleId: payload.sub
      }
    });
    
    console.log("=== ✅ AUTENTICAÇÃO GOOGLE CONCLUÍDA ===");
    
  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO NO LOGIN COM GOOGLE:");
    console.error("   Mensagem:", error.message);
    console.error("   Stack:", error.stack);
    console.error("   Tipo:", error.constructor.name);
    
    // Erros específicos do Prisma
    if (error.code === 'P2002') {
      console.error("   ❌ Erro de duplicidade no banco");
      return reply.status(400).send({ 
        success: false,
        message: "Email já cadastrado no sistema"
      });
    }
    
    // Erro geral
    reply.status(500).send({ 
      success: false,
      message: "Erro interno no servidor",
      error: error.message
    });
  }
});



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

  app.post("/forgot-password", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { email } = req.body as any;
    
    const user = await prisma.usuario.findUnique({
      where: { email },
    });
    
    if (user) {
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 3600_000);
      
      await prisma.usuario.update({
        where: { email },
        data: { resetToken: resetCode, resetTokenExpiry: expiry }
      });
      
      await sendResetCodeEmail(email, resetCode);
    }
    
    reply.code(200).send({ 
      success: true, // <-- IMPORTANTE: Adicionar esta linha
      message: "Se o email existir, um código de redefinição foi enviado." 
    });
    
  } catch (error) {
    console.error("Erro ao processar esqueci minha senha:", error);
    reply.status(500).send({ 
      success: false, // <-- IMPORTANTE
      message: "Erro ao processar solicitação" 
    });
  }
});

  app.post("/reset-password", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const { code, password } = req.body as any;
    
    console.log('\n🔐 SOLICITAÇÃO DE RESET DE SENHA');
    console.log(`📋 Código: ${code}`);
    
    const user = await prisma.usuario.findFirst({
      where: { resetToken: code }
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return reply.status(400).send({ 
        success: false, // <-- IMPORTANTE
        message: "Código inválido ou expirado." 
      });
    }

    const hashedPassword = await hashPassword(password);
    
    const isUpdated = await prisma.usuario.update({
      where: { id_usuario: user.id_usuario },
      data: {
        senha: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    console.log('✅ Senha atualizada com sucesso para:', user.email);
    
    return reply.status(200).send({ 
      success: true, // <-- IMPORTANTE: Adicionar esta linha
      message: "Senha redefinida com sucesso." 
    });
    
  } catch (error) {
    console.error("❌ Erro ao redefinir senha:", error);
    reply.status(500).send({ 
      success: false, // <-- IMPORTANTE
      message: "Erro interno ao redefinir senha.",
      error: error.message 
    });
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
        BI: user.BI,
        role: user.role
      });

      reply.send({
        message: "Login realizado com sucesso",
        token,
        user: {
          id_usuario: user.id_usuario,
          nome: user.nome,
          email: user.email,
          BI: user.BI,
          role: user.role
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
          role: true,
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
          BI: true,
          role: true
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
        BI: user.BI,
        role: user.role
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