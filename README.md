# InvoiceQue Ecosystem

Arsitektur microservice untuk InvoiceQue SaaS Platform.

## Tech Stack

| Service | Language | Framework | Database | Port |
|---------|----------|-----------|----------|------|
| API Gateway | Go | Gin | — | 8080 |
| Auth Service | Go | Gin | PostgreSQL | 8001 |
| Client Service | Go | Gin | PostgreSQL | 8002 |
| Invoice Service | Java 21 | Spring Boot 3 | PostgreSQL | 8003 |
| Payment Service | Rust | Actix-Web | PostgreSQL | 8004 |
| Notification Service | Go | Gin + RabbitMQ | — | 8005 |

## Quick Start

```bash
# Start all services
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Endpoints

All requests go through the API Gateway at `http://localhost:8080`:

### Auth
- `POST /api/v1/auth/register` — Register
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh token
- `GET  /api/v1/auth/profile` — Profile (auth required)

### Clients (auth required)
- `GET    /api/v1/clients` — List
- `POST   /api/v1/clients` — Create
- `GET    /api/v1/clients/:id` — Detail
- `PUT    /api/v1/clients/:id` — Update
- `DELETE /api/v1/clients/:id` — Delete

### Invoices (auth required)
- `GET    /api/v1/invoices` — List
- `POST   /api/v1/invoices` — Create
- `GET    /api/v1/invoices/:id` — Detail
- `PUT    /api/v1/invoices/:id` — Update
- `DELETE /api/v1/invoices/:id` — Delete
- `PUT    /api/v1/invoices/:id/send` — Send to client

### Dashboard (auth required)
- `GET /api/v1/dashboard/stats` — Statistics

### Payments (auth required)
- `GET    /api/v1/payments` — List
- `POST   /api/v1/payments` — Create payment link
- `GET    /api/v1/payments/:id` — Detail
- `PUT    /api/v1/payments/:id` — Update
- `DELETE /api/v1/payments/:id` — Delete

### Public
- `GET  /api/v1/pay/:id` — Payment page
- `POST /api/v1/payments/webhook` — Payment webhook

## RabbitMQ Management

- URL: `http://localhost:15672`
- Username: `invoiceque`
- Password: `invoiceque123`
