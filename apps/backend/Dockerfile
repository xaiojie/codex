FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
RUN pnpm install --filter @crs/backend...

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

RUN pnpm prisma:generate
RUN pnpm build

EXPOSE 8080

CMD ["/bin/sh", "-c", "pnpm prisma:migrate && pnpm prisma:seed && node dist/index.js"]
