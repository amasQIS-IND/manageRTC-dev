# Frontend Dockerfile
# Multi-stage build for production deployment

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV REACT_APP_BACKEND_URL=http://localhost:5000

# Build the application
RUN npm run build

# Production stage
FROM nginx:1.25-alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy assets only (not source files)
COPY --from=build /app/public /usr/share/nginx/html/public

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --timeout=3 http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
