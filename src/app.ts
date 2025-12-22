import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import * as dotenv from "dotenv";

import authRoutes from "./modules/auth/auth.routes";
import usuarioRoutes from "./modules/usuarios/usuarios.routes";
import servicoRoutes from "./modules/servicos/servicos.routes";

// Carregar variáveis de ambiente PRIMEIRO de forma explícita
const envResult = dotenv.config();

// Verificar se o dotenv carregou corretamente
if (envResult.error) {
  console.error("❌ ERRO ao carregar .env:", envResult.error);
} else {
  console.log("✅ .env carregado com sucesso");
  console.log("📝 Variáveis carregadas:", Object.keys(envResult.parsed || {}).length);
}

// DEBUG: Verificar se JWT_SECRET está disponível
console.log("🔍 Verificando JWT_SECRET no process.env:", process.env.JWT_SECRET ? "✅ Disponível" : "❌ NÃO encontrado");
console.log("🔍 Verificando PORT:", process.env.PORT);

// Verificar se JWT_SECRET está definido
if (!process.env.JWT_SECRET) {
  console.error("❌ ERRO CRÍTICO: JWT_SECRET não está definido no arquivo .env");
  console.error("   Verifique se o arquivo .env existe na raiz do projeto");
  console.error("   Verifique se JWT_SECRET está definido no arquivo");
  process.exit(1);
}

// Converter CORS_ORIGINS de string para array
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const app = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL as any || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }
});

// Registros de plugins
app.register(cors, {
  origin: corsOrigins,
  credentials: true
});

app.register(jwt, { 
  secret: process.env.JWT_SECRET 
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});

// Swagger/OpenAPI documentation
app.register(swagger, {
  swagger: {
    info: {
      title: 'Twendy API',
      description: 'API para a plataforma Twendy',
      version: process.env.API_VERSION || '1.0.0'
    },
    host: `localhost:${process.env.PORT || 3000}`,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Insira o token JWT no formato: Bearer {token}'
      }
    }
  }
});

app.register(swaggerUI, { 
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true
});

// Rotas
app.register(authRoutes, { prefix: `/api/${process.env.API_VERSION || 'v1'}/auth` });
app.register(usuarioRoutes, { prefix: `/api/${process.env.API_VERSION || 'v1'}/usuarios` });
app.register(servicoRoutes, { prefix: `/api/${process.env.API_VERSION || 'v1'}/servicos` });

// Rota de saúde
app.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION
  };
});

// Rota raiz
app.get('/', async () => {
  return { 
    message: 'Twendy API está rodando!',
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    docs: '/docs',
    health: '/health',
    apiBase: `/api/${process.env.API_VERSION || 'v1'}`
  };
});

// Rota para ver variáveis de ambiente (apenas desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.get('/env-check', async () => {
    return {
      loaded: !envResult.error,
      error: envResult.error?.message,
      variables: {
        JWT_SECRET: process.env.JWT_SECRET ? '***' : 'MISSING',
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV,
        CORS_ORIGINS: process.env.CORS_ORIGINS,
        total: Object.keys(process.env).filter(k => k.includes('_')).length
      }
    };
  });
}

export default app;