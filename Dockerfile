# First Stage: Setup the base environment
FROM duceswild99/pathology:base

# for web app
RUN npm run build --omit=dev
# we may need the following to prevent `Failed to write image to cache` errors
RUN chown -R node:node .next/

# for socket server
RUN tsc -p tsconfig-socket.json

USER node

CMD ["npm","start"]