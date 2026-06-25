FROM node:20-bookworm-slim

WORKDIR /app

COPY backend/node/package*.json ./backend/node/
RUN npm --prefix backend/node ci --omit=dev

COPY . .

ENV NODE_ENV=production
CMD ["npm", "--prefix", "backend/node", "run", "start"]
