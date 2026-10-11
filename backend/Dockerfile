FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV STRAPI_TELEMETRY_DISABLED=true
COPY package*.json ./
RUN npm ci
COPY . .
RUN ESTETICA_DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build
RUN npm prune --omit=dev
RUN mkdir -p /app/public/uploads
ENV NODE_ENV=production
EXPOSE 1337
# Strapi must receive Railway's SIGTERM directly for a clean deployment shutdown.
CMD ["node", "node_modules/@strapi/strapi/bin/strapi.js", "start"]
