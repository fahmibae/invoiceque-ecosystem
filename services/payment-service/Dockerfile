FROM rust:alpine AS builder

RUN apk add --no-cache musl-dev pkgconfig openssl-dev

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
# Create dummy main to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true

# Copy actual source
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

FROM alpine:3.19
RUN apk --no-cache add ca-certificates libgcc
WORKDIR /app
COPY --from=builder /app/target/release/payment-service .
COPY migrations ./migrations
EXPOSE 8004
CMD ["./payment-service"]
