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

// Carregar dotenv no app.ts também para garantir
dotenv.config();

// Verificar JWT_SECRET aqui também como fallback
if (!process.env.JWT_SECRET) {
    console.error("❌ [app.ts] ERRO: JWT_SECRET não definido!");
    // Não sair aqui, deixar o server.ts tratar
}

// Converter CORS_ORIGINS de string para array
const getCorsOrigins = () => {
    if (process.env.CORS_ORIGINS) {
        return process.env.CORS_ORIGINS.split(',').map(origin => origin.trim());
    }
    return ['http://localhost:5173', 'http://localhost:3000'];
};

const app = Fastify({
    logger: {
        level: (process.env.LOG_LEVEL as any) || 'info',
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
    origin: getCorsOrigins(),
    credentials: true
});

// Verificar JWT_SECRET antes de registrar
const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_development_only';
if (jwtSecret === 'fallback_secret_development_only') {
    console.warn('⚠️  Usando segredo JWT de fallback. Certifique-se de configurar JWT_SECRET no .env para produção!');
}

app.register(jwt, {
    secret: jwtSecret
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
                in: 'heade r',
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
    }
});

// Rotas com prefixo baseado no API_VERSION
app.register(authRoutes, { prefix: `/auth` });
app.register(usuarioRoutes, { prefix: `/usuarios` });
app.register(servicoRoutes, { prefix: `/servicos` });

// Rota de saúde
app.get('/health', async () => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.API_VERSION || '1.0.0'
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
    };
});

export default app;