# This file tells Docker how to build our app into an "image" (a package
# that has everything needed to run the app, so it works the same on any
# computer). We build it in 3 stages so the final image is small and does
# not include things we only needed while building (like TypeScript).

# We use "slim" instead of the tiny "alpine" version of Node, because the
# database tool we use (Prisma) can run into missing-file problems on
# alpine. "slim" is still small, but avoids that headache.


# ---------------------------------------------------------------------------
# STAGE 1: install the npm packages
# ---------------------------------------------------------------------------
FROM node:20-slim AS deps

WORKDIR /app

# Prisma (our database tool) needs openssl installed to work correctly.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only the files needed to install packages first.
# Docker is smart: if these files don't change, it reuses this step next
# time instead of redoing it, which makes rebuilds much faster.
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci


# ---------------------------------------------------------------------------
# STAGE 2: build the app
# ---------------------------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Reuse the packages we already installed in stage 1.
COPY --from=deps /app/node_modules ./node_modules

# Now copy the rest of the project (our actual code).
COPY . .

# A dummy database address, only used so the build step doesn't fail.
# The build does not actually connect to a database, it just needs this
# value to exist. The real one is set later, when we run the container.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/queueva"
ENV JWT_ACCESS_SECRET="build-time-placeholder-please-set-a-real-one-when-running"
ENV JWT_REFRESH_SECRET="build-time-placeholder-please-set-a-real-one-when-running"

RUN npm run build


# ---------------------------------------------------------------------------
# STAGE 3: the final, small image that actually runs the app
# ---------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Next.js builds a small, self-contained version of the app called
# "standalone". We only copy that, plus the public and static files,
# instead of copying the whole project. This is what keeps the final
# image small.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma's database engine files sometimes get missed by the automatic
# "standalone" copy above, so we copy them ourselves to be safe.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "server.js"]
