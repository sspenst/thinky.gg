FROM node:18 AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEW_RELIC_LICENSE_KEY=dummy
ARG NEW_RELIC_APP_NAME=dummy

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --production

FROM node:18-slim AS runner
WORKDIR /app

ENV NEW_RELIC_LOG_ENABLED=false
ENV NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES="404,401"

RUN npm install -g ts-node

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json

USER node

CMD ["npm","start"]