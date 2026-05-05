# InvoiceQu Monolith Worker

A high-performance modular monolith built with **Rust** for **Cloudflare Workers**, consolidating all 6 microservices + API Gateway into a single WASM deployment.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Cloudflare Worker (Rust/WASM)       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Auth   │  │  Client  │  │ Invoice  │      │
│  │  Module  │  │  Module  │  │  Module  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │            │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐      │
│  │ Payment  │  │  Notif   │  │   Subs   │      │
│  │  Module  │  │  Module  │  │  Module  │      │
│  └────┬─────┘  └──────────┘  └────┬─────┘      │
│       │                           │              │
│  ┌────┴──────────────────────────┴──────┐       │
│  │    Neon HTTP SQL Client (db.rs)       │       │
│  └───────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐         ┌────┴────┐
    │  Neon   │         │ PayPal/ │
    │ DBs x5  │         │ Xendit  │
    └─────────┘         └─────────┘
```

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) CLI v3+
- Cloudflare account with Workers enabled

## Quick Start

```bash
# 1. Install dependencies
rustup target add wasm32-unknown-unknown
cargo install worker-build

# 2. Set secrets
wrangler secret put JWT_SECRET
wrangler secret put AUTH_DB_URL
wrangler secret put CLIENT_DB_URL
wrangler secret put INVOICE_DB_URL
wrangler secret put PAYMENT_DB_URL
wrangler secret put SUBSCRIPTION_DB_URL
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_SECRET
wrangler secret put XENDIT_API_KEY
wrangler secret put XENDIT_CALLBACK_TOKEN
wrangler secret put RESEND_API_KEY

# 3. Deploy
wrangler deploy
```

## Project Structure

```
workers/monolith-api/
├── Cargo.toml              # Rust dependencies
├── wrangler.toml            # CF Worker config + secrets
├── src/
│   ├── lib.rs               # Entry point + router (replaces API Gateway)
│   ├── db.rs                # Neon HTTP SQL client
│   ├── middleware.rs         # JWT auth + CORS
│   ├── utils.rs             # Shared helpers
│   └── services/
│       ├── mod.rs            # Module declarations
│       ├── auth.rs           # Auth service (register, login, profile)
│       ├── client.rs         # Client service (CRUD)
│       ├── invoice.rs        # Invoice service (CRUD, dashboard, settings)
│       ├── payment.rs        # Payment service (links, PayPal, Xendit)
│       ├── notification.rs   # Notification service (email via Resend)
│       └── subscription.rs   # Subscription service (plans, usage)
```

## API Routes

All routes preserve the original `/api/v1/` prefix for frontend compatibility.

### Public
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/google` | Google OAuth |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |
| GET | `/api/v1/pay/:id` | Public payment page |
| POST | `/api/v1/pay-checkout/:id` | Create checkout |
| POST | `/api/v1/pay-capture/:id` | Capture payment |
| GET | `/api/v1/pay-status/:id` | Check payment status |
| POST | `/api/v1/webhooks/payments` | Xendit webhook |
| POST | `/api/v1/webhooks/paypal` | PayPal webhook |
| GET | `/api/v1/plans` | List subscription plans |

### Protected (JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/api/v1/auth/profile` | User profile |
| GET/POST | `/api/v1/clients` | List/Create clients |
| GET/PUT/DELETE | `/api/v1/clients/:id` | Client operations |
| GET/POST | `/api/v1/invoices` | List/Create invoices |
| GET/PUT/DELETE | `/api/v1/invoices/:id` | Invoice operations |
| GET | `/api/v1/dashboard/stats` | Dashboard statistics |
| GET/PUT | `/api/v1/invoice-settings` | Invoice settings |
| GET/POST | `/api/v1/payments` | Payment links |
| GET | `/api/v1/subscriptions/current` | Current subscription |

## Key Design Decisions

1. **Database via HTTP**: Uses Neon's serverless HTTP SQL API since CF Workers can't open TCP sockets
2. **JWT via HMAC-SHA256**: Pure Rust `hmac`+`sha2` crates (no `ring` dependency = clean wasm compile)
3. **bcrypt in WASM**: Pure Rust implementation, ~200ms per hash (acceptable for auth endpoints)
4. **Email via Resend API**: CF Workers can't use SMTP; uses HTTP-based Resend API instead
5. **Inter-service calls → direct function calls**: No HTTP overhead between modules

## Migration from Microservices

The original microservices are preserved in `/services/` for potential future use:
- `services/auth-service/` (Go)
- `services/client-service/` (Go)
- `services/invoice-service/` (Go)
- `services/payment-service/` (Rust)
- `services/notification-service/` (Go)
- `services/subscription-service/` (Go)
