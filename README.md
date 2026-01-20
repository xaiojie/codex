# Codex 转发平台（OpenAI-compatible Gateway）

一个可直接上线的 Codex 转发平台单体仓库，包含：
- **后端**：Node.js + TypeScript + Fastify
- **前端管理台**：React + Vite + TypeScript + Ant Design
- **数据库迁移**：PostgreSQL + Prisma
- **限流与配额**：Redis
- **一键启动**：Docker Compose + `scripts/start.sh`
- **激活器**：`packages/activator` CLI

## 目录结构

```
apps/
  backend/            # API 服务 + OpenAI Responses Gateway
  frontend/           # 管理台
packages/
  activator/          # 卡密激活 CLI
scripts/
  start.sh            # 一键启动脚本
docker-compose.yml
README.md
```

## 快速启动（Docker Compose）

1. 复制环境变量示例：

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

2. 配置上游 OpenAI 兼容提供商：

编辑 `apps/backend/.env`，设置：

```
UPSTREAM_BASE_URL=https://api.openai.com/v1
UPSTREAM_API_KEY=你的上游密钥
ADMIN_TOKEN=你自己的管理员令牌
```

3. 一键启动：

```bash
./scripts/start.sh
```

服务默认地址：
- **后端**：`http://localhost:8080`
- **前端**：`http://localhost:4173`

> 首次启动会自动运行 Prisma migration + seed。

## 管理台功能

- **API 密钥管理**：创建 / 启用 / 禁用 / 删除 / 设置 scope 与额度
- **使用统计**：
  - 顶部卡片展示配额与已用金额
  - 折线图展示按天模型用量
  - 明细表展示模型、token、费用等

## API Key 体系说明

- Key 格式：`sk-` 开头高熵字符串
- 数据库存储：仅存 `key_hash (SHA-256)` 与 `prefix`（前 8 位）
- 支持 scopes：`{ "mode": "codex-only" }` 或 `{ "mode": "all" }`
- 支持日额度 / 总额度 / 到期时间

## 激活器（卡密激活）

1. 运行 CLI：

```bash
pnpm install
pnpm activator
```

2. 输入卡密，成功后会返回 API Key，并写入：
- `~/.codex/config.toml`
- 环境变量：`CRS_OAI_KEY`

生成的 `config.toml` 示例（自动写入）：

```toml
model_provider="crs"
model="gpt-5.2-codex"
model_reasoning_effort="high"
disable_response_storage=true
preferred_auth_method="apikey"

[model_providers.crs]
name="crs"
base_url="http://localhost:8080/openai"
wire_api="responses"
requires_openai_auth=true
env_key="CRS_OAI_KEY"
```

## Codex 连接本地网关

在终端中执行：

```bash
export CRS_OAI_KEY="你的平台 Key"
```

然后运行：

```bash
codex -m gpt-5.2-codex --dangerously-bypass-approvals-and-sandbox
```

## 网关调用示例（Responses API）

```bash
curl http://localhost:8080/openai/v1/responses \
  -H "Authorization: Bearer YOUR_PLATFORM_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.2-codex",
    "input": "Write a hello world"
  }'
```

## 管理端 API 示例

```bash
curl http://localhost:8080/api/keys \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN"
```

## 数据库 Seed

默认会创建：
- 管理员账号：`admin@codex.local`
- 初始卡密：`CRS-START-0001` ~ `CRS-START-0004`

## 本地开发（非 Docker）

```bash
pnpm install
pnpm --filter @crs/backend prisma:generate
pnpm --filter @crs/backend prisma:migrate
pnpm --filter @crs/backend prisma:seed
pnpm --filter @crs/backend dev
pnpm --filter @crs/frontend dev
```

> 前端默认 `http://localhost:5173`，后端默认 `http://localhost:8080`

