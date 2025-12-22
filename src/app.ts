import Fastify from "fastify";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import cors from "cors";
import * as dotenv from "dotenv";

import authRoutes from "./modules/auth/auth.routes";
import usuarioRoutes from "./modules/usuarios/usuarios.routes";
import servicoRoutes from "./modules/servicos/servicos.routes";

// Carregar dotenv
dotenv.config();

// Verificar variáveis importantes
if (!process.env.JWT_SECRET) {
    console.error("❌ ERRO: JWT_SECRET não definido no .env");
    console.error("   Certifique-se de que o arquivo .env existe e tem JWT_SECRET");
    process.exit(1);
}

const app = Fastify({
    logger: true
});

// Configurar CORS
const corsOptions = {
    origin: process.env.CORS_ORIGINS 
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Access-Token', 'X-API-Key']
};

// Middleware CORS para Fastify
app.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    
    // Aplicar regras CORS
    if (origin) {
        const allowedOrigins = corsOptions.origin;
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            reply.header('Access-Control-Allow-Origin', origin);
            reply.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
            reply.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
            reply.header('Access-Control-Allow-Credentials', 'true');
        }
    }
    
    // Preflight requests
    if (request.method === 'OPTIONS') {
        reply.status(204).send();
        return;
    }
    
    done();
});

// Registrar JWT
app.register(jwt, {
    secret: process.env.JWT_SECRET
});

// Registrar multipart
app.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024,
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
    }
});

// Rotas
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
        health: '/health'
    };
});

export default app;