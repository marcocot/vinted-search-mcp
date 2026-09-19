FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

# `package-import-method=hardlink` fixes a real failure, not a slow build. The
# homelab host runs the zfs storage driver, and pnpm's default method populates
# the store through `copy_file_range`, which ZFS block cloning answers with a
# spurious EAGAIN. pnpm does not retry, so the build dies. Hardlinks never make
# that call.
#
# `pnpm fetch` reads the lockfile alone, so the network layer stays cached until
# dependencies genuinely change and the install runs `--offline`.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set package-import-method hardlink \
    && pnpm config set store-dir /tmp/pnpm-store \
    && pnpm fetch

COPY package.json tsconfig.json ./
RUN pnpm install --frozen-lockfile --offline

COPY src ./src
RUN pnpm build && pnpm prune --prod

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    VIN_TRANSPORT=http \
    VIN_HTTP_HOST=0.0.0.0

# tini as PID 1, so a stopped container reaps its children instead of leaving
# them to the kernel.
RUN apk add --no-cache tini

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.VIN_HTTP_PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/server.js"]
