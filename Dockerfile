FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .
RUN npm run audio:mixkit && npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/client/package.json client/package.json
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/public server/public
EXPOSE 3000
CMD ["node", "server/dist/server/src/index.js"]
