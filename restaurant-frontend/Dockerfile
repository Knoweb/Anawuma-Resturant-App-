# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .

# Set dynamic API URL for building (can be overridden)
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Final Stage: Serve with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config if we had one (optional, default is fine for simple SPA)
# EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
