FROM node:20-slim

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
RUN pnpm install --filter @crs/frontend...

COPY apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend

RUN pnpm build

EXPOSE 4173

CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "4173"]
