FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Install yarn globally
# RUN npm install -g yarn

COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Build the application
# RUN pnpm run build

# Expose port 3000 for the application
EXPOSE 3000

# Start the application in development mode
CMD ["yarn", "start:dev"]