FROM node:24-alpine

# Patch OS packages and drop the bundled package managers: Bridge has no npm
# dependencies, so npm/yarn/corepack only add attack surface (and their CVEs).
RUN apk upgrade --no-cache \
    && apk add --no-cache bash git curl ca-certificates \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
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
