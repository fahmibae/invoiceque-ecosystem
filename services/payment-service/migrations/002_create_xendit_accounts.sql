CREATE TABLE IF NOT EXISTS xendit_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    xendit_user_id VARCHAR(100) NOT NULL UNIQUE,
    account_email VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'REGISTERED',
    account_type VARCHAR(20) DEFAULT 'MANAGED',
    platform_fee_percent DOUBLE PRECISION DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xendit_accounts_user_id ON xendit_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_xendit_accounts_xendit_user_id ON xendit_accounts(xendit_user_id);
