import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { config } from "./config.js";
import { registerKeyRoutes } from "./routes/keys.js";
import { registerActivateRoute } from "./routes/activate.js";
import { registerUsageRoutes } from "./routes/usage.js";
import { registerGatewayRoutes } from "./routes/gateway.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(helmet);

app.get("/health", async () => ({ status: "ok" }));

await registerKeyRoutes(app);
await registerActivateRoute(app);
await registerUsageRoutes(app);
await registerGatewayRoutes(app);

app.setErrorHandler((error, request, reply) => {
  if (error?.issues) {
    return reply.status(400).send({
      error: {
        message: "Invalid request",
        type: "validation_error",
        code: "invalid_request"
      },
      details: error.issues
    });
  }
  request.log.error(error);
  return reply.status(500).send({
    error: {
      message: "Internal server error",
      type: "server_error",
      code: "internal_error"
    }
  });
});

app.listen({ port: config.PORT, host: "0.0.0.0" });
