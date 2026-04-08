# Build static assets, then serve with nginx
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Baked into the bundle. Empty = browser uses same-origin `/api/v1` (path-routed nginx).
# Override only if the SPA is served from a different host than the API.
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Bump with backend KYC_SCHEMA_BUILD when SPA/API contract changes (busts build cache).
ARG WEB_ASSETS_BUILD=6
LABEL org.bavlykyc.web-assets-build="${WEB_ASSETS_BUILD}"

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
