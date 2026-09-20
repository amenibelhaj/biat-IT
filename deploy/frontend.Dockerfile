# ---- étape 1 : compilation de l'interface React ----
FROM node:20-alpine AS build

ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY=""

WORKDIR /app
COPY biat-frontend/package*.json ./
RUN npm install

COPY biat-frontend/ ./
RUN npm run build

# ---- étape 2 : service des fichiers par Nginx ----
FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
