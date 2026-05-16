FROM node:22-alpine

WORKDIR /app

# EasyPanel copia este Dockerfile para code/Dockerfile com build context = code/
# Build local: docker build -f server/Dockerfile .
ARG SRC=.

COPY ${SRC}/package.json ${SRC}/package-lock.json ./
RUN npm i

COPY ${SRC}/firebase-applet-config.json ./
COPY ${SRC}/server/index.cjs ./
COPY ${SRC}/server/services/ ./services/

# Service account deve ser montada como volume/secret em produção

ENV PORT=3412
EXPOSE 3412

CMD ["node", "index.cjs"]
