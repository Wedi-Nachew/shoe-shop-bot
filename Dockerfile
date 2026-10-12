# Build stage for dashboard
FROM node:20-alpine AS dashboard-build

WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci --no-audit --no-fund
COPY dashboard/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

# better-sqlite3 needs these for native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Rebuild better-sqlite3 for this platform
RUN npm rebuild better-sqlite3

# Copy source code
COPY src/ ./src/
COPY tools/ ./tools/

# Copy built dashboard from build stage
COPY --from=dashboard-build /app/dashboard/dist ./dashboard/dist

# Create data directory (will be mounted as volume)
RUN mkdir -p /data

# Environment
ENV NODE_ENV=production
ENV DB_PATH=/data/shop.db

EXPOSE 3000

CMD ["node", "src/bot/index.js"]