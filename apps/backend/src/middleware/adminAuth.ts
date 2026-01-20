import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { sendOpenAIError } from "../utils/errors.js";

export async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers["x-admin-token"];
  if (token !== config.ADMIN_TOKEN) {
    return sendOpenAIError(reply, 401, "Unauthorized", "auth_error", "unauthorized");
  }
}
