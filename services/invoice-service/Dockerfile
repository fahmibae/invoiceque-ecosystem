FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /invoice-service .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates wkhtmltopdf
WORKDIR /app
COPY --from=builder /invoice-service .
COPY migrations/ ./migrations/
COPY templates/ ./templates/
EXPOSE 8003
CMD ["./invoice-service"]
