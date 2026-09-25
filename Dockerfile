# ==============================================================================
# Stage 1: Build Desktop Web Frontend
# ==============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Build Mobile Companion Web App
# ==============================================================================
FROM node:22-alpine AS mobile-builder
WORKDIR /build/mobile

COPY eventspace-mobile/package*.json ./
RUN npm install

COPY eventspace-mobile/ ./
RUN npm run build

# ==============================================================================
# Stage 3: Build Backend & Package Production Runtime
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime dependencies for Prisma SQLite and Unraid user switching
RUN apk add --no-cache openssl libc6-compat su-exec

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/eventspace.db"

# Install backend dependencies
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install && npx prisma generate

# Build backend TypeScript
COPY backend/ ./
RUN npm run build

# Copy icon assets, desktop web assets (to /public), and mobile companion assets (to /public/companion)
COPY Resources ./Resources
COPY --from=frontend-builder /build/frontend/dist ./public
COPY --from=mobile-builder /build/mobile/dist ./public/companion

# Setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/data

EXPOSE 3000
VOLUME ["/app/data"]

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
