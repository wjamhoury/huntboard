FROM node:22-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .

# Run as non-root
RUN chown -R node:node /app
USER node

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

CMD ["npm", "run", "dev", "--", "--host"]
