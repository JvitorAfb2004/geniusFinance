FROM node:22-alpine

WORKDIR /app

# Copia package.json e instala dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia config do Firebase (precisa pra firebase-auth.cjs)
COPY firebase-applet-config.json ./

# Copia o servidor inteiro
COPY server/index.cjs ./
COPY server/services/ ./services/

# Service account deve ser montada como volume/secret em produção
# NÃO copiar aqui — usar docker run -v ou secrets manager

ENV PORT=3412
EXPOSE 3412

CMD ["node", "index.cjs"]
