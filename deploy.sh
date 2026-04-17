#!/bin/bash
set -e

# ============================================================
# InvoiceQue — Fly.io Deploy Script
# ============================================================
# Usage:
#   ./deploy.sh all          — Deploy semua service
#   ./deploy.sh <service>    — Deploy satu service
#   ./deploy.sh secrets      — Set semua secrets
#
# Prerequisites:
#   1. Install flyctl: curl -L https://fly.io/install.sh | sh
#   2. Login: fly auth login
#   3. Set environment variables di .env.production
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }
success() { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
error() { echo -e "${RED}[❌]${NC} $1"; exit 1; }

# ── Create Apps ──────────────────────────────────────────────
create_apps() {
  log "Creating Fly.io apps..."

  local apps=(
    "invoiceque-rabbitmq"
    "invoiceque-gateway"
    "invoiceque-auth"
    "invoiceque-client"
    "invoiceque-invoice"
    "invoiceque-payment"
    "invoiceque-notification"
    "invoiceque-subscription"
    "invoiceque-web"
  )

  for app in "${apps[@]}"; do
    if fly apps list | grep -q "$app"; then
      warn "$app already exists, skipping..."
    else
      fly apps create "$app" --org invoiceque-345
      success "Created $app"
    fi
  done

  # Create volume for RabbitMQ
  log "Creating RabbitMQ volume..."
  fly volumes create rabbitmq_data --app invoiceque-rabbitmq --region sin --size 1 --yes 2>/dev/null || warn "Volume may already exist"
}

# ── Set Secrets ──────────────────────────────────────────────
set_secrets() {
  log "Setting secrets..."

  if [ ! -f "$ROOT_DIR/.env.production" ]; then
    error ".env.production not found! Create it first. See .env.production.example"
  fi

  source "$ROOT_DIR/.env.production"

  # RabbitMQ
  fly secrets set RABBITMQ_DEFAULT_PASS="$RABBITMQ_PASSWORD" --app invoiceque-rabbitmq

  # Auth
  fly secrets set DB_URL="$AUTH_DB_URL" JWT_SECRET="$JWT_SECRET" --app invoiceque-auth

  # Client
  fly secrets set DB_URL="$CLIENT_DB_URL" --app invoiceque-client

  # Invoice
  fly secrets set \
    SPRING_DATASOURCE_URL="$INVOICE_DB_URL" \
    SPRING_DATASOURCE_USERNAME="$INVOICE_DB_USERNAME" \
    SPRING_DATASOURCE_PASSWORD="$INVOICE_DB_PASSWORD" \
    SPRING_RABBITMQ_USERNAME="invoiceque" \
    SPRING_RABBITMQ_PASSWORD="$RABBITMQ_PASSWORD" \
    --app invoiceque-invoice

  # Payment
  fly secrets set \
    DATABASE_URL="$PAYMENT_DB_URL" \
    RABBITMQ_URL="amqp://invoiceque:${RABBITMQ_PASSWORD}@invoiceque-rabbitmq.internal:5672" \
    XENDIT_API_KEY="$XENDIT_API_KEY" \
    XENDIT_CALLBACK_TOKEN="$XENDIT_CALLBACK_TOKEN" \
    --app invoiceque-payment

  # Notification
  fly secrets set \
    RABBITMQ_URL="amqp://invoiceque:${RABBITMQ_PASSWORD}@invoiceque-rabbitmq.internal:5672" \
    SMTP_HOST="$SMTP_HOST" \
    SMTP_PORT="$SMTP_PORT" \
    SMTP_USER="$SMTP_USERNAME" \
    SMTP_PASS="$SMTP_PASSWORD" \
    FROM_EMAIL="$SMTP_USERNAME" \
    --app invoiceque-notification

  # Subscription
  fly secrets set DB_URL="$SUBSCRIPTION_DB_URL" --app invoiceque-subscription

  # Gateway
  fly secrets set JWT_SECRET="$JWT_SECRET" --app invoiceque-gateway

  success "All secrets set!"
}

# ── Deploy Functions ─────────────────────────────────────────
deploy_rabbitmq() {
  log "Deploying RabbitMQ..."
  cd "$ROOT_DIR/infrastructure/rabbitmq"
  fly deploy --app invoiceque-rabbitmq
  success "RabbitMQ deployed!"
}

deploy_auth() {
  log "Deploying Auth Service..."
  cd "$ROOT_DIR/services/auth-service"
  fly deploy
  success "Auth Service deployed!"
}

deploy_client() {
  log "Deploying Client Service..."
  cd "$ROOT_DIR/services/client-service"
  fly deploy
  success "Client Service deployed!"
}

deploy_invoice() {
  log "Deploying Invoice Service..."
  cd "$ROOT_DIR/services/invoice-service"
  fly deploy
  success "Invoice Service deployed!"
}

deploy_payment() {
  log "Deploying Payment Service..."
  cd "$ROOT_DIR/services/payment-service"
  fly deploy
  success "Payment Service deployed!"
}

deploy_notification() {
  log "Deploying Notification Service..."
  cd "$ROOT_DIR/services/notification-service"
  fly deploy
  success "Notification Service deployed!"
}

deploy_subscription() {
  log "Deploying Subscription Service..."
  cd "$ROOT_DIR/services/subscription-service"
  fly deploy
  success "Subscription Service deployed!"
}

deploy_gateway() {
  log "Deploying API Gateway..."
  cd "$ROOT_DIR/api_gateway"
  fly deploy
  success "API Gateway deployed!"
}

deploy_frontend() {
  log "Deploying Frontend..."
  cd "$ROOT_DIR/frontend/InvoiceQue"
  fly deploy
  success "Frontend deployed!"
}

deploy_all() {
  log "🚀 Deploying ALL InvoiceQue services to Fly.io..."
  echo ""

  deploy_rabbitmq
  sleep 10  # Wait for RabbitMQ to be healthy

  deploy_auth
  deploy_client
  deploy_invoice
  deploy_payment
  deploy_notification
  deploy_subscription
  deploy_gateway
  deploy_frontend

  echo ""
  success "🎉 All services deployed!"
  echo ""
  echo -e "${GREEN}URLs:${NC}"
  echo "  Frontend:  https://invoiceque-web.fly.dev"
  echo "  API:       https://invoiceque-gateway.fly.dev/api/v1"
  echo ""
}

# ── Main ─────────────────────────────────────────────────────
case "${1:-help}" in
  create)     create_apps ;;
  secrets)    set_secrets ;;
  rabbitmq)   deploy_rabbitmq ;;
  auth)       deploy_auth ;;
  client)     deploy_client ;;
  invoice)    deploy_invoice ;;
  payment)    deploy_payment ;;
  notification) deploy_notification ;;
  subscription) deploy_subscription ;;
  gateway)    deploy_gateway ;;
  frontend)   deploy_frontend ;;
  all)        deploy_all ;;
  *)
    echo "Usage: ./deploy.sh <command>"
    echo ""
    echo "Commands:"
    echo "  create        Create all Fly.io apps"
    echo "  secrets       Set all secrets from .env.production"
    echo "  all           Deploy all services"
    echo "  rabbitmq      Deploy RabbitMQ only"
    echo "  auth          Deploy Auth Service only"
    echo "  client        Deploy Client Service only"
    echo "  invoice       Deploy Invoice Service only"
    echo "  payment       Deploy Payment Service only"
    echo "  notification  Deploy Notification Service only"
    echo "  subscription  Deploy Subscription Service only"
    echo "  gateway       Deploy API Gateway only"
    echo "  frontend      Deploy Frontend only"
    echo ""
    echo "Deploy order: create → secrets → all"
    ;;
esac
