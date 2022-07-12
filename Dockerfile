FROM node:18

ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node . .
RUN npm run build --production

USER node

cmd ["npm","start"]