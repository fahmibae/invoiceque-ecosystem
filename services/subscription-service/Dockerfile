FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o subscription-service .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/subscription-service .
COPY --from=builder /app/migrations ./migrations
EXPOSE 8006
CMD ["./subscription-service"]
