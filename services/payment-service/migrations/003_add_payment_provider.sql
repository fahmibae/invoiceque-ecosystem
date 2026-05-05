-- Migration 003: Add payment provider support
-- payment_links: multi-provider tracking
-- paypal_accounts: user only needs PayPal email (platform owns API credentials)

ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) DEFAULT NULL;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_links_provider_order ON payment_links(provider_order_id) WHERE provider_order_id IS NOT NULL;

-- Simple PayPal connection — user only provides their PayPal email
CREATE TABLE IF NOT EXISTS paypal_accounts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    paypal_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
