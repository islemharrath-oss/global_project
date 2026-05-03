# Frontend Dockerfile for MedVision

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Production stage - Serve with nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Create logs directory
RUN mkdir -p /var/log/nginx

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

