# API Node.js
FROM node:20-alpine

ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""

WORKDIR /app

# Les dépendances sont installées avant la copie du code, afin que le cache
# Docker ne soit invalidé que lorsque package.json change.
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

# L'application ne tourne pas en root.
RUN addgroup -S biat && adduser -S biat -G biat \
 && mkdir -p uploads && chown -R biat:biat /app
USER biat

EXPOSE 5000
CMD ["node", "server.js"]
