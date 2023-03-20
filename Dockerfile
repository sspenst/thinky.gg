FROM node:18
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEW_RELIC_LOG_ENABLED=false
ENV NEW_RELIC_ERROR_COLLECTOR_IGNORE_ERROR_CODES="404,401"

RUN npm config set fund false
RUN npm install -g ts-node

COPY package*.json ./
RUN npm install --platform=linuxmusl

ARG NEW_RELIC_LICENSE_KEY=dummy
ARG NEW_RELIC_APP_NAME=dummy

COPY --chown=node:node . .
RUN npm run build --production

USER node

CMD ["npm","start"]