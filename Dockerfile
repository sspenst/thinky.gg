FROM node:18

WORKDIR /app

COPY --chown=node:node package*.json /app
RUN npm install

COPY --chown=node:node . /app
RUN npm run build

USER node

cmd ["npm","start"]