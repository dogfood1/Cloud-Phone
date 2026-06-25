FROM node:20-bookworm-slim

WORKDIR /app

COPY frontend/web/package*.json ./frontend/web/
RUN npm --prefix frontend/web ci

COPY . .

ENV NODE_ENV=production
CMD ["npm", "--prefix", "frontend/web", "run", "start"]
