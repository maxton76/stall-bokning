# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy shared package first (pre-built)
COPY shared/ ./shared/

# Copy Docker-specific package files
COPY package.docker.json ./package.json
COPY package-lock.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy shared package
COPY shared/ ./shared/

# Copy Docker-specific package files
COPY package.docker.json ./package.json
COPY package-lock.json ./

# Install only production dependencies
RUN npm install --production

# Copy built API application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
