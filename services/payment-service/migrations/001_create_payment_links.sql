CREATE TABLE IF NOT EXISTS payment_links (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    status VARCHAR(20) DEFAULT 'active',
    url VARCHAR(500) NOT NULL,
    clicks INTEGER DEFAULT 0,
    payments INTEGER DEFAULT 0,
    invoice_id VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX idx_payment_links_status ON payment_links(status);
CREATE INDEX idx_payment_links_invoice_id ON payment_links(invoice_id);
