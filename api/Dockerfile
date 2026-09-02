# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- Dependencies (install workspace deps once) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
RUN npm ci

# ---- Build the API ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY api ./api
# Generate the Prisma client into node_modules before compiling.
RUN npm run prisma:generate --workspace api
RUN npm run build --workspace api

# ---- Runtime ----
FROM base AS runtime
ENV NODE_ENV=production
# node_modules from the build stage includes the generated Prisma client.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/prisma ./api/prisma
COPY api/package.json ./api/package.json
COPY api/prisma.config.ts ./api/prisma.config.ts
COPY api/docker-entrypoint.sh ./api/docker-entrypoint.sh
RUN chmod +x ./api/docker-entrypoint.sh

WORKDIR /app/api
EXPOSE 3333
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/infra/main.js"]
