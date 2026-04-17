CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price DOUBLE PRECISION NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    billing_period VARCHAR(20) DEFAULT 'monthly',
    max_invoices INTEGER DEFAULT 5,
    max_clients INTEGER DEFAULT 10,
    max_payment_links INTEGER DEFAULT 5,
    features TEXT DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    plan_id VARCHAR(64) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    invoices_used INTEGER DEFAULT 0,
    clients_used INTEGER DEFAULT 0,
    payment_links_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Seed default plans
INSERT INTO subscription_plans (id, name, display_name, price, max_invoices, max_clients, max_payment_links, features) VALUES
    ('plan_free', 'free', 'Free', 0, 5, 10, 5, '["basic_invoicing","email_notifications"]'),
    ('plan_pro', 'pro', 'Pro', 99000, 100, 500, 100, '["basic_invoicing","email_notifications","custom_branding","priority_support","xendit_integration"]'),
    ('plan_enterprise', 'enterprise', 'Enterprise', 299000, -1, -1, -1, '["basic_invoicing","email_notifications","custom_branding","priority_support","xendit_integration","api_access","dedicated_support","sla"]')
ON CONFLICT (id) DO NOTHING;
