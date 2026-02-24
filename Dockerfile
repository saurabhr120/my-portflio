FROM node:20-alpine

WORKDIR /app

COPY . /app

ENV NODE_ENV=production
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

EXPOSE 8080

CMD ["node", "api/server.js"]
