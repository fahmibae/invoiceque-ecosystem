#!/bin/bash
# ============================================================
# InvoiceQu Monolith Worker — Deploy Script
# ============================================================
set -e

echo "🚀 InvoiceQu Monolith Worker Deployment"
echo "========================================="

# Check prerequisites
command -v wrangler >/dev/null 2>&1 || { echo "❌ wrangler CLI not found. Install: npm i -g wrangler"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "❌ cargo not found. Install Rust: https://rustup.rs"; exit 1; }

# Ensure wasm target
echo "📦 Ensuring wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# Install worker-build if needed
echo "🔧 Installing worker-build..."
cargo install -q worker-build 2>/dev/null || true

# Build
echo "🏗️  Building worker..."
worker-build --release

echo "✅ Build successful!"
echo ""

# Check if secrets are set
echo "🔐 Before deploying, make sure all secrets are configured:"
echo "   wrangler secret put JWT_SECRET"
echo "   wrangler secret put AUTH_DB_URL"
echo "   wrangler secret put CLIENT_DB_URL"
echo "   wrangler secret put INVOICE_DB_URL"
echo "   wrangler secret put PAYMENT_DB_URL"
echo "   wrangler secret put SUBSCRIPTION_DB_URL"
echo "   wrangler secret put PAYPAL_CLIENT_ID"
echo "   wrangler secret put PAYPAL_SECRET"
echo "   wrangler secret put XENDIT_API_KEY"
echo "   wrangler secret put XENDIT_CALLBACK_TOKEN"
echo "   wrangler secret put RESEND_API_KEY"
echo ""

read -p "🚀 Deploy now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler deploy
    echo ""
    echo "✅ Deployed! Your worker is live."
    echo "🔗 Test: curl https://invoicequ-api.<your-subdomain>.workers.dev/health"
else
    echo "⏭️  Skipped deployment. Run 'wrangler deploy' when ready."
fi
