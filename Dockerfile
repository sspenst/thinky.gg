FROM node:18

ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node . .
RUN npm run build --production
RUN chown -R node:node .next

USER node

cmd ["npm","start"]