# Dependencies stage - cache npm packages separately
FROM node:22-alpine AS deps
WORKDIR /thinky_app
COPY --chown=node:node package*.json ./
RUN npm config set fund false && \
    npm ci --only=production --platform=linux --arch=x64 && \
    npm install --platform=linux --arch=x64 sharp && \
    npm install --platform=linuxmusl

# Base stage with environment and source code
FROM node:22-alpine AS base
WORKDIR /thinky_app

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

# Copy node_modules from deps stage
COPY --from=deps --chown=node:node /thinky_app/node_modules ./node_modules

# Install only module-alias globally (needed for production socket server)
RUN npm config set fund false && npm install -g module-alias

# Copy source code
COPY --chown=node:node . .

# Web app builder stage
FROM base AS web-builder
RUN npm run build

# Socket server builder stage  
FROM base AS socket-builder
RUN npx tsc -p tsconfig-socket.json

# Final production stage
FROM base AS final
# Copy built web app from web-builder stage
COPY --from=web-builder --chown=node:node /thinky_app/.next ./.next
# Copy compiled socket server from socket-builder stage
COPY --from=socket-builder --chown=node:node /thinky_app/dist ./dist

USER node

CMD ["npm","start"]
