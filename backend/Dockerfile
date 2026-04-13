FROM node:20-alpine AS base
WORKDIR /app

FROM base AS shared-build
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

FROM base AS backend-deps
COPY --from=shared-build /app/shared ./shared
COPY backend/package.json ./backend/
RUN cd backend && npm install --ignore-scripts
RUN cd backend && npm rebuild bcrypt

FROM base AS backend-build
COPY --from=backend-deps /app/shared ./shared
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
RUN cd backend && npx nest build

FROM base AS production
ENV NODE_ENV=production
COPY --from=shared-build /app/shared ./shared
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
WORKDIR /app/backend
EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
