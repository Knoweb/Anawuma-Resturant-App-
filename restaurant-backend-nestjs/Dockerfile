# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Final Stage
FROM node:20-alpine

WORKDIR /app

# Copy built app and dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Create uploads directory (with proper permissions)
RUN mkdir -p uploads && chmod 777 uploads

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
