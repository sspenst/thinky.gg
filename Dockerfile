# First Stage: Setup the base environment
FROM node:22-alpine AS base

WORKDIR /thinky_app
COPY --chown=node:node package*.json ./

RUN npm install --platform=linux --arch=x64 sharp && npm install --platform=linuxmusl

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEW_RELIC_LOG_ENABLED=false
ENV NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES="404,401"
ARG NEW_RELIC_LICENSE_KEY=dummy
ARG NEW_RELIC_APP_NAME=dummy
# avoid using the db when building pages
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

# ts-node / tspath is needed for other scripts right now. module-alias is used for socket server production
# ideally all would use package module alias and we would not need ts-node / tspath. but that's a TODO
RUN npm config set fund false && \
    npm install -g ts-node typescript module-alias

# HERE IS WHERE WE WANT TO END WHERE THE BASE IMAGE IS
COPY --chown=node:node . .

FROM base AS final

# for web app. this step takes approx 83s on github runner
RUN npm run build --omit=dev
# we may need the following to prevent `Failed to write image to cache` errors
RUN chown -R node:node .next/

# for socket server. this command takes appro 14s on github runner
RUN tsc -p tsconfig-socket.json

USER node

CMD ["npm","start"]
