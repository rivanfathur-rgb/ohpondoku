# Gunakan image node resmi
FROM node:18

# Set working directory
WORKDIR /app

# Copy seluruh project ke dalam container
COPY . .

# Masuk ke folder bot dan install library
RUN cd bot && npm install

# Beritahu Railway ini aplikasi Node, bukan static
ENV NODE_ENV=production

# Jalankan bot secara langsung
CMD ["node", "bot/index.js"]