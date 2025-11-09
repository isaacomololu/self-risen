# Multi-stage build for NestJS application (Railway optimized)

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code and config files
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Setup pnpm and install Prisma CLI for migrations (matching project version)
RUN pnpm setup && pnpm add -g prisma@6.3.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy Prisma schema and generated client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Copy built application
COPY --from=build /app/dist ./dist

# Copy Firebase credentials if they exist (Railway will handle this via env vars or file mounts)
COPY firebase-credentials.json* ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Railway sets PORT automatically, but we default to 8080
ENV PORT=8080

EXPOSE 8080

# Health check (using root endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start script that runs migrations then starts the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

