# syntax=docker/dockerfile:1

ARG NODE_VERSION=24
ARG GO_VERSION=1.27

# ---- Stage 1: build the frontend ----
FROM node:${NODE_VERSION}-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: build the backend ----
FROM golang:${GO_VERSION}-alpine AS backend
WORKDIR /app
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# ---- Stage 3: minimal runtime image ----
FROM gcr.io/distroless/static:nonroot
WORKDIR /app
COPY --from=backend /server /app/server
COPY --from=frontend /app/dist /app/public

ENV PORT=8080 \
    STATIC_DIR=/app/public
EXPOSE 8080

ENTRYPOINT ["/app/server"]