import { FastifyReply } from "fastify";

export function sendOpenAIError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  type = "invalid_request_error",
  code = "error"
) {
  return reply.status(statusCode).send({
    error: {
      message,
      type,
      code
    }
  });
}
