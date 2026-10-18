-- ==========================================
-- 1. CUSTOM ENUMS
-- ==========================================
CREATE TYPE category_type AS ENUM ('OPERATING_EXPENSE', 'CAPITAL_EXPENSE', 'WITHDRAWAL', 'INCOME');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE audit_action AS ENUM ('CREATED', 'EDITED', 'SOFT_DELETED');
CREATE TYPE po_status AS ENUM ('PENDING', 'PARTIAL', 'COMPLETE');

-- ==========================================
-- 2. CORE TABLES
-- ==========================================

-- Accounts (Where the money lives)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Categories (The buckets)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type category_type NOT NULL,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- Transactions (The immutable ledger)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    vendor_gst_number VARCHAR(50),
    receipt_image_url TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- High-performance partial indexes for active ledger records
CREATE INDEX idx_transactions_active_date ON transactions(date DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_active_account ON transactions(account_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_active_category ON transactions(category_id) WHERE is_deleted = FALSE;

-- Audit Logs (Partner Trust System - RESTRICT prevents audit tampering)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_logs_transaction ON audit_logs(transaction_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Purchase Orders (Tracking delayed parcels)
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(255) NOT NULL,
    total_expected_amount DECIMAL(15,2) NOT NULL CHECK (total_expected_amount > 0),
    total_received_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 CHECK (total_received_amount >= 0.00),
    status po_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goods Receipts (Individual parcel arrivals)
CREATE TABLE goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    received_amount DECIMAL(15,2) NOT NULL CHECK (received_amount > 0),
    received_date DATE NOT NULL,
    notes TEXT
);

-- Monthly Snapshots (For the Business Growth Chart)
CREATE TABLE monthly_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2020),
    cash_balance DECIMAL(15,2) NOT NULL,
    inventory_value DECIMAL(15,2) NOT NULL,
    total_business_value DECIMAL(15,2) NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(month, year)
);

-- ==========================================
-- 3. AUTOMATION TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. SEED DATA
-- ==========================================
INSERT INTO accounts (name, current_balance) VALUES 
('Main Cash Drawer', 0.00),
('HDFC Bank Account', 0.00),
('PhonePe UPI', 0.00);

INSERT INTO categories (name, type, is_system_default) VALUES 
('Sales Revenue', 'INCOME', TRUE),
('Inventory Purchase', 'CAPITAL_EXPENSE', TRUE),
('Reinvestment', 'CAPITAL_EXPENSE', TRUE),
('Partner Withdrawal', 'WITHDRAWAL', TRUE),
('Rent', 'OPERATING_EXPENSE', TRUE),
('Salaries', 'OPERATING_EXPENSE', TRUE),
('Electricity & Utilities', 'OPERATING_EXPENSE', TRUE),
('Transportation & Petrol', 'OPERATING_EXPENSE', TRUE),
('Staff Welfare & Snacks', 'OPERATING_EXPENSE', TRUE),
('Repairs & Maintenance', 'OPERATING_EXPENSE', TRUE),
('Miscellaneous', 'OPERATING_EXPENSE', TRUE);
