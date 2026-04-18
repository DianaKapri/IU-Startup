FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY projects/sanpin-audit-ui/package.json projects/sanpin-audit-ui/package-lock.json ./projects/sanpin-audit-ui/
RUN cd projects/sanpin-audit-ui && npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
