FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./
COPY --from=builder /app/public ./public

RUN npm rebuild sqlite3

EXPOSE 3000

CMD ["npm", "start"]