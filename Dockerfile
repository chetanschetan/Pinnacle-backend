# 1) Build Stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2) Run Stage (Lighter & Faster)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
# Copy only the compiled javascript from the builder
COPY --from=builder /app/dist ./dist
# If you have an uploads folder, ensure it exists
RUN mkdir -p uploads

EXPOSE 5000
# Use the 'start' script which runs node dist/server.js
CMD ["npm", "start"]
