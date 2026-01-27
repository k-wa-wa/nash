# Stage 1: Build Frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY frontend ./
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.24 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy built frontend assets to the expected location
COPY --from=frontend-builder /app/cmd/server/dist ./cmd/server/dist
# Build static binary
# -ldflags="-w -s": Reduce binary size by stripping debug info
# CGO_ENABLED=0: Ensure static linking
ARG BUILD_TIME=unknown
ARG COMMIT_HASH=unknown
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s -X main.BuildTime=${BUILD_TIME} -X main.CommitHash=${COMMIT_HASH}" -o nash ./cmd/server

# Stage 3: Runtime
FROM scratch
WORKDIR /
# Copy CA certificates for HTTPS requests if needed
COPY --from=backend-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
# Copy the binary
COPY --from=backend-builder /app/nash .

EXPOSE 8080
ENTRYPOINT ["/nash"]
