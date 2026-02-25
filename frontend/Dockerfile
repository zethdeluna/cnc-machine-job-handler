# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Accept the API URL at build time
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# ---- Production ----
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html

#nginx config to handle React Router (client-side routing)
RUN echo 'server { \
	listen 80; \
	location / { \
		root /usr/share/nginx/html; \
		try_files $uri $uri/ /index.html; \
	} \
}' > etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]