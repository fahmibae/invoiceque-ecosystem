# ── Stage 1: Build ──
FROM rust:1.82-slim-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo 'fn main() { println!("placeholder"); }' > src/main.rs
RUN cargo build --release 2>/dev/null || true
RUN rm -rf src
COPY src/ src/
RUN cargo build --release

# ── Stage 2: Runtime ──
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/invoicequ-monolith /usr/local/bin/
ENV PORT=8080
EXPOSE 8080
CMD ["invoicequ-monolith"]
