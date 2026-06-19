FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY api ./api
COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["npx", "tsx", "api/server.ts"]
