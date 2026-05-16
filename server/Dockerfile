FROM node:22-alpine

WORKDIR /app

# Build context no EasyPanel é o pai de code/. Default SRC=code.
# Build local:  docker build --build-arg SRC=. -f server/Dockerfile .
ARG SRC=code

COPY ${SRC}/package.json ${SRC}/package-lock.json ./
RUN npm i

COPY ${SRC}/firebase-applet-config.json ./
COPY ${SRC}/server/index.cjs ./
COPY ${SRC}/server/services/ ./services/

# Service account deve ser montada como volume/secret em produção
# NÃO copiar aqui — usar docker run -v ou secrets manager

ENV PORT=3412
EXPOSE 3412

CMD ["node", "index.cjs"]
