# Stage 1: Build dependencies (includes dev dependencies)
FROM node:22-alpine AS build-deps
WORKDIR /thinky_app

# Copy package files
COPY --chown=node:node package*.json ./

# Install all dependencies including dev dependencies for building
RUN npm config set fund false && \
    npm ci --platform=linux --arch=x64 && \
    npm install --platform=linux --arch=x64 sharp && \
    npm install --platform=linuxmusl && \
    npm install -g ts-node typescript module-alias

# Stage 2: Build the application
FROM build-deps AS builder

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEW_RELIC_LOG_ENABLED=false
ENV NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES="404,401"
ARG NEW_RELIC_LICENSE_KEY=dummy
ARG NEW_RELIC_APP_NAME=dummy
ARG OFFLINE_BUILD=true

# Add ARG declarations for NEXT_PUBLIC environment variables
ARG NEXT_PUBLIC_APP_DOMAIN
ARG NEXT_PUBLIC_GROWTHBOOK_API_HOST
ARG NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST

# Set them as environment variables so they're available during build
ENV NEXT_PUBLIC_APP_DOMAIN=$NEXT_PUBLIC_APP_DOMAIN
ENV NEXT_PUBLIC_GROWTHBOOK_API_HOST=$NEXT_PUBLIC_GROWTHBOOK_API_HOST
ENV NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY=$NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Copy source code
COPY --chown=node:node . .

# Build the web app and socket server in parallel
RUN npm run build:fast && \
    tsc -p tsconfig-socket.json && \
    chown -R node:node .next/

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /thinky_app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package.json and node_modules for production
COPY --from=builder --chown=nextjs:nodejs /thinky_app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /thinky_app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /thinky_app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /thinky_app/public ./public

# Copy socket server build
COPY --from=builder --chown=nextjs:nodejs /thinky_app/server ./server

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]