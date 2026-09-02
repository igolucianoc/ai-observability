# AI Observability Hub

Plataforma de observabilidade para aplicações de IA: tracing, uso de tokens, custo, latência, erros e métricas.

Modelo de dados: `trace → span → LLM call → usage/error`.

> Projeto de portfólio. Todos os dados são genéricos e sintéticos — sem dados reais ou segredos.

## Stack

- **Backend:** NestJS + TypeScript (Clean Architecture / Vertical Slices)
- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Banco:** PostgreSQL + Prisma
- **Fila:** Redis / BullMQ (reservado para uso futuro)
- **Validação:** Zod
- **Testes:** Vitest
- **Runtime:** Docker Compose
- **IA (opcional):** Hugging Face Inference API (com fallback em modo mock)

## Estrutura do monorepo

```
ai-observability/
├── api/                # Backend NestJS (Clean Architecture + Vertical Slices)
├── web/                # Frontend Next.js
├── docs/               # Documentação técnica
├── docker-compose.yml  # Orquestra api, web, postgres, redis
├── .env.example
└── README.md
```

Gerenciado com **npm workspaces**. Os scripts da raiz distribuem para `api` e `web`.

## Arquitetura

O backend segue Clean Architecture com fatias verticais por módulo de negócio, e camadas
transversais `core/` (bases compartilhadas) e `infra/` (infraestrutura). Cada módulo tem
`domain` (entidades, erros, contratos de repositório), `application` (use cases + services),
`persistence` (implementações Prisma e InMemory) e `presentation` (controllers + schemas Zod).

Módulos: `auth`, `projects`, `tracing` (ingestão + leitura), `analytics`, `events` (SSE),
`insights` (IA) e `health`. A regra de dependência aponta para dentro: Presentation → Application →
Domain, com Persistence implementando os contratos do Domain.

O frontend usa a estrutura clássica do Next.js (`app/`, `components/`, `hooks/`, `lib/`, `types/`),
com validação de fronteira via Zod e atualização em tempo quase real por SSE.

> Convenção: identificadores e comentários de código ficam em inglês; documentação e interface
> voltada ao usuário ficam em português.

## Como executar

### Opção A — Docker (um comando)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3333

> Se as portas 3000, 3333, 5432 ou 6379 já estiverem em uso na sua máquina, sobrescreva as portas
> de host no `.env` (`WEB_PORT`, `API_PORT`, `POSTGRES_PORT`, `REDIS_PORT`) antes de subir.

### Opção B — Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run dev
```

### Banco e dados de demonstração

As migrations do Prisma e o seed populam projetos, traces, spans, LLM calls, usage e erros com
cenários realistas (sucesso, timeout, erro de provider, alto custo e alta latência).

```bash
# com o Postgres de pé e DATABASE_URL apontando para ele:
npm run prisma:migrate:dev --workspace api
npm run db:seed --workspace api
```

Usuário de demonstração criado pelo seed: `demo@ai-observability.dev` / `demo-password-123`.

## Scripts da raiz

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe `api` e `web` em modo watch (via `concurrently`) |
| `npm run build` | Builda `api` e `web` |
| `npm run test` | Roda os testes de `api` e `web` |
| `npm run lint` | Lint de `api` e `web` |
| `npm run typecheck` | Type-check de `api` e `web` |

## Autenticação

JWT de acesso e refresh transportados em cookies **httpOnly, secure, sameSite**. O refresh token é
opaco e persistido apenas como hash (SHA-256), com **rotação** a cada uso e **detecção de reuso**
(um token rotacionado reapresentado revoga toda a família). Rate limiting nas rotas sensíveis e
headers de segurança via helmet. Acesso a projetos/traces/analytics é protegido por ownership.

## Observabilidade do próprio sistema

A API se auto-observa com logs estruturados (JSON) e um correlation id por requisição
(`x-request-id`), sem loops e sem vazar segredos/PII. Detalhes em
[`docs/observability.md`](./docs/observability.md).

## Insights com IA (Hugging Face)

O módulo `insights` gera uma explicação em linguagem natural do resultado de um trace
(`POST /api/insights/traces/:id/explain`), útil para diagnosticar execuções com erro. Usa a
Hugging Face Inference API quando `HF_API_TOKEN` está configurado; **sem token, roda em modo mock**
(respostas sintéticas determinísticas), de forma que a feature funciona offline. Apenas sinais
estruturais (status, tipo de erro, modelo, latência) são enviados ao modelo — nunca prompts,
respostas ou PII. Configure em `.env`: `HF_API_TOKEN`, `HF_MODEL`, `HF_TIMEOUT_MS`,
`HF_MAX_NEW_TOKENS`.

## Problemas conhecidos

- O `npm audit` reporta advisories em dependências **transitivas de desenvolvimento/build**
  (postcss via Next.js, tar/node-pre-gyp via bcrypt na instalação, faker e deepmerge-ts em
  ferramentas de dev). Nenhuma é acessível no runtime da aplicação com entrada não confiável. As
  correções disponíveis exigem mudanças que quebram compatibilidade (ex.: Next.js major), fora do
  escopo do portfólio. Uma melhoria futura de supply-chain é migrar `bcrypt` para `bcryptjs`
  (JS puro, sem a cadeia nativa tar/node-pre-gyp).

## Documentação

Veja [`docs/`](./docs) para notas de arquitetura e observabilidade.
