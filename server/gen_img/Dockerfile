FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Install Playwright browsers
RUN npx playwright install --with-deps

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD [ "node", "app.js" ]
