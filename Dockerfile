FROM node:24-alpine

RUN apk add --no-cache bash git curl ca-certificates \
    && mkdir -p /workspace /home/node/.bridge \
    && chown node:node /workspace /home/node/.bridge

WORKDIR /app
COPY package.json ./
COPY secure-folder-mcp/server.js ./secure-folder-mcp/server.js

ENV NODE_ENV=production \
    BRIDGE_HOST=0.0.0.0

USER node
WORKDIR /workspace
EXPOSE 3000

ENTRYPOINT ["node", "/app/secure-folder-mcp/server.js"]
CMD ["/workspace", "--http", "3000"]
