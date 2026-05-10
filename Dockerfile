FROM node:18-slim

WORKDIR /app

# Copy package.json dari folder bot
COPY bot/package*.json ./bot/

# Install dependencies di dalam folder bot
RUN cd bot && npm install

# Copy seluruh kodingan
COPY . .

# Jalankan bot
CMD ["node", "bot/index.js"]