# AI Observability Hub

Observability platform for AI applications: tracing, token usage, cost, latency, errors and metrics.

Data model: `trace → span → LLM call → usage/error`.

> Portfolio project. All data is generic and synthetic — no real data or secrets.

## Stack

- **Backend:** NestJS + TypeScript (Clean Architecture / Vertical Slices)
- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Database:** PostgreSQL + Prisma
- **Queue:** Redis / BullMQ (reserved for future use)
- **Validation:** Zod
- **Tests:** Vitest
- **Runtime:** Docker Compose

## Monorepo layout

```
ai-observability/
├── api/                # Backend NestJS (Clean Architecture + Vertical Slices)
├── web/                # Frontend Next.js
├── docs/               # Technical documentation
├── docker-compose.yml  # Orchestrates api, web, postgres, redis
├── .env.example
└── README.md
```

Managed with **npm workspaces**. Root scripts fan out to `api` and `web`.

## Getting started

### Option A — Docker (single command)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3333

### Option B — Local development

```bash
cp .env.example .env
npm install
npm run dev
```

## Root scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Runs `api` and `web` in watch mode (via `concurrently`) |
| `npm run build` | Builds `api` and `web` |
| `npm run test` | Runs tests for `api` and `web` |
| `npm run lint` | Lints `api` and `web` |
| `npm run typecheck` | Type-checks `api` and `web` |

## Documentation

See [`docs/`](./docs) for architecture and technical notes.
