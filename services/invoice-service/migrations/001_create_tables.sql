-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    payment_type VARCHAR(10) DEFAULT 'full',
    dp_percentage INTEGER DEFAULT 0,
    dp_amount DECIMAL(15,2) DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    amount_remaining DECIMAL(15,2) DEFAULT 0,
    due_date VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    payment_link TEXT,
    remaining_payment_link TEXT,
    currency VARCHAR(10) DEFAULT 'IDR'
);

-- Add currency to existing tables if upgrading
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IDR';

-- Add exchange_rate_idr to lock rate at payment time
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate_idr DECIMAL(15,4) DEFAULT 0;

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL
);

-- Create invoice_settings table
CREATE TABLE IF NOT EXISTS invoice_settings (
    user_id VARCHAR(64) PRIMARY KEY,
    business_name VARCHAR(255) DEFAULT '',
    business_email VARCHAR(255) DEFAULT '',
    business_phone VARCHAR(255) DEFAULT '',
    business_website VARCHAR(255) DEFAULT '',
    business_address TEXT DEFAULT '',
    logo_url TEXT,
    accent_color VARCHAR(7) DEFAULT '#DC2626',
    footer_text VARCHAR(255) DEFAULT 'Terima kasih atas kepercayaan Anda 🙏'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Add payment settings columns
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) DEFAULT '';
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(255) DEFAULT '';
ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255) DEFAULT '';

-- Change logo_url to TEXT to allow base64 images
ALTER TABLE invoice_settings ALTER COLUMN logo_url TYPE TEXT;

