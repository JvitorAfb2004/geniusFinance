FROM node:22-alpine

WORKDIR /app

# Build context = raiz do repositório (code/)
COPY package.json package-lock.json ./
RUN npm i

COPY firebase-applet-config.json ./
COPY server/index.cjs ./
COPY server/services/ ./services/

# Service account deve ser montada como volume/secret em produção
ENV PORT=3412
EXPOSE 3412

CMD ["node", "index.cjs"]
