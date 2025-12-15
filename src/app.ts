import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import dotenv from "dotenv";

import authRoutes from "./modules/auth/auth.routes";
import usuarioRoutes from "./modules/usuarios/usuarios.routes";
import servicoRoutes from "./modules/servicos/servicos.routes";

dotenv.config();

const app = Fastify({ logger: true });

app.register(cors);
app.register(jwt, { secret: process.env.JWT_SECRET! });
app.register(multipart);

app.register(swagger);
app.register(swaggerUI, { routePrefix: "/docs" });

app.register(authRoutes, { prefix: "/auth" });
app.register(usuarioRoutes, { prefix: "/usuarios" });
app.register(servicoRoutes, { prefix: "/servicos" });

export default app;
