FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /invoice-service .

FROM surnet/alpine-wkhtmltopdf:3.20.3-0.12.6-small AS wkhtmltopdf

FROM alpine:3.20
RUN apk --no-cache add ca-certificates ttf-freefont fontconfig libstdc++ libx11 libxrender libxext libssl3 libcrypto3
COPY --from=wkhtmltopdf /bin/wkhtmltopdf /usr/local/bin/wkhtmltopdf
WORKDIR /app
COPY --from=builder /invoice-service .
COPY migrations/ ./migrations/
COPY templates/ ./templates/
EXPOSE 8003
CMD ["./invoice-service"]
