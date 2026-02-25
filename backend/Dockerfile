# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Development ----
FROM base AS development
COPY . .
CMD ["npm", "run", "dev"]

# ---- Build ----
FROM base AS builder
COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]