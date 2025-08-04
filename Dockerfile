# Production dependencies stage
FROM node:22-alpine AS deps-prod
WORKDIR /thinky_app

# Copy package files
COPY --chown=node:node package*.json ./
RUN npm config set fund false && \
    npm ci --omit=dev --platform=linux --arch=x64 && \
    npm install --platform=linux --arch=x64 sharp && \
    npm install --platform=linuxmusl

# All dependencies stage (including dev dependencies for builds)
FROM node:22-alpine AS deps-all
WORKDIR /thinky_app
COPY --chown=node:node package*.json ./
RUN npm config set fund false && \
    npm ci --platform=linux --arch=x64 && \
    npm install --platform=linux --arch=x64 sharp && \
    npm install --platform=linuxmusl

# Base stage with environment and source code
FROM node:22-alpine AS base
WORKDIR /thinky_app

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

# Copy production node_modules from deps-prod stage
COPY --from=deps-prod --chown=node:node /thinky_app/node_modules ./node_modules

# Install only module-alias globally (needed for production socket server)
RUN npm config set fund false && npm install -g module-alias

# Copy source code
COPY --chown=node:node . .

# Builder base stage with all dependencies (including dev deps)
FROM node:22-alpine AS builder-base
WORKDIR /thinky_app

# Copy all dependencies including dev dependencies
COPY --from=deps-all --chown=node:node /thinky_app/node_modules ./node_modules

# Copy source code and environment variables
COPY --chown=node:node . .

# Set build environment variables
ARG NEXT_PUBLIC_APP_DOMAIN
ARG NEXT_PUBLIC_GROWTHBOOK_API_HOST  
ARG NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEW_RELIC_LICENSE_KEY=dummy
ARG NEW_RELIC_APP_NAME=dummy
ARG OFFLINE_BUILD=true

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEW_RELIC_LOG_ENABLED=false
ENV NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES="404,401"
ENV NEXT_PUBLIC_APP_DOMAIN=$NEXT_PUBLIC_APP_DOMAIN
ENV NEXT_PUBLIC_GROWTHBOOK_API_HOST=$NEXT_PUBLIC_GROWTHBOOK_API_HOST
ENV NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY=$NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Web app builder stage
FROM builder-base AS web-builder
RUN npm run build

# Socket server builder stage  
FROM builder-base AS socket-builder
RUN ./node_modules/.bin/tsc -p tsconfig-socket.json

# Final production stage
FROM base AS final
# Copy built web app from web-builder stage
COPY --from=web-builder --chown=node:node /thinky_app/.next ./.next
# Copy compiled socket server from socket-builder stage
COPY --from=socket-builder --chown=node:node /thinky_app/dist ./dist

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package.json and node_modules for production
COPY --from=builder --chown=nextjs:nodejs /thinky_app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /thinky_app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /thinky_app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /thinky_app/public ./public

# Copy socket server build (compiled JavaScript from dist/)
COPY --from=builder --chown=nextjs:nodejs /thinky_app/dist ./dist

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]