FROM node:20-bookworm-slim

WORKDIR /app

# better-sqlite3 native module may compile from source on some platforms
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend/node/package*.json ./backend/node/
RUN npm --prefix backend/node ci --omit=dev

COPY . .

ENV NODE_ENV=production
CMD ["npm", "--prefix", "backend/node", "run", "start"]
