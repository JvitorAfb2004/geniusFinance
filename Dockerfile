FROM node:22-alpine
WORKDIR /app
COPY server/index.cjs ./
ENV PORT=3412
EXPOSE 3412
CMD ["node", "index.cjs"]
