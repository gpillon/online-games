FROM node:20-alpine AS base
WORKDIR /app

FROM base AS shared-build
COPY shared/package.json shared/tsconfig*.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

FROM base AS frontend-deps
COPY --from=shared-build /app/shared ./shared
COPY frontend/package.json ./frontend/
RUN cd frontend && npm install

FROM base AS frontend-build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY --from=shared-build /app/shared ./shared
COPY --from=frontend-deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

FROM nginx:alpine AS production
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
