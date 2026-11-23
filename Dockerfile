FROM node:24.21.0-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_HOME=/corepack
ENV pnpm_config_store_dir=/pnpm/store
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack install && pnpm --version && chown -R node:node /corepack

FROM base AS dev
RUN mkdir -p /app/node_modules /app/apps/web/node_modules /app/packages/core/node_modules /pnpm/store \
    && chown -R node:node /app /pnpm
USER node
EXPOSE 5173
CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm dev"]

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.30.0-alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
