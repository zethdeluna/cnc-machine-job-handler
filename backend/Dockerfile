# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# ---- Development ----
FROM base AS development
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ---- Build ----
FROM base AS build
COPY . .
RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]