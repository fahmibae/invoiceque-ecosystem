CREATE TABLE IF NOT EXISTS subscription_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    plan_id VARCHAR(64) NOT NULL REFERENCES subscription_plans(id),
    amount DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    checkout_url TEXT,
    external_id VARCHAR(100),
    xendit_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_tx_user_id ON subscription_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_tx_external_id ON subscription_transactions(external_id);

-- Add xendit_id column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE subscription_transactions ADD COLUMN IF NOT EXISTS xendit_id VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
