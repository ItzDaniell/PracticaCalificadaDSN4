FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT} || exit 1

CMD ["npm", "start"]
