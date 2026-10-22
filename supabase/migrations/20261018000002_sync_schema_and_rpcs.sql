-- ==========================================
-- 1. SCHEMA PATCHES (Missing Columns & Tables)
-- ==========================================

-- Add actor to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor VARCHAR(255) DEFAULT 'Unknown';

-- Add missing columns to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Add missing columns to goods_receipts
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS received_by VARCHAR(255);
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS challan_number VARCHAR(100);
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Create monthly_closures table (Expected by api.getMonthlyClosures)
CREATE TABLE IF NOT EXISTS monthly_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2020),
    status VARCHAR(20) DEFAULT 'DRAFT',
    net_profit DECIMAL(15,2) NOT NULL,
    alloc_opex DECIMAL(15,2) DEFAULT 0,
    alloc_salaries DECIMAL(15,2) DEFAULT 0,
    alloc_reinvestment DECIMAL(15,2) DEFAULT 0,
    alloc_partner_payout DECIMAL(15,2) DEFAULT 0,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(255),
    UNIQUE(month, year)
);

-- ==========================================
-- 2. RPC UPDATES (Adding p_actor and matching API params)
-- ==========================================

-- Update create_financial_transaction
CREATE OR REPLACE FUNCTION create_financial_transaction(
  p_account_id UUID, 
  p_category_id UUID, 
  p_amount DECIMAL(15,2), 
  p_type transaction_type, 
  p_date DATE, 
  p_actor VARCHAR(255) DEFAULT 'Unknown', 
  p_description TEXT DEFAULT NULL, 
  p_vendor_gst_number VARCHAR(50) DEFAULT NULL,
  p_receipt_image_url TEXT DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  v_new_transaction transactions%ROWTYPE; 
  v_balance_change DECIMAL(15,2);
BEGIN
  IF p_amount <= 0 THEN 
    RAISE EXCEPTION 'Amount must be greater than 0'; 
  END IF;

  INSERT INTO transactions (
    account_id, category_id, amount, type, date, description, vendor_gst_number, receipt_image_url
  ) VALUES (
    p_account_id, p_category_id, p_amount, p_type, p_date, p_description, p_vendor_gst_number, p_receipt_image_url
  ) RETURNING * INTO v_new_transaction;
  
  v_balance_change := CASE WHEN p_type = 'INCOME' THEN p_amount ELSE -p_amount END;
  UPDATE accounts SET current_balance = current_balance + v_balance_change WHERE id = p_account_id;
  
  INSERT INTO audit_logs (transaction_id, action, actor, new_data)
  VALUES (v_new_transaction.id, 'CREATED', p_actor, row_to_json(v_new_transaction));

  RETURN row_to_json(v_new_transaction);
END; 
$$;

-- Update soft_delete_transaction to include actor
CREATE OR REPLACE FUNCTION soft_delete_transaction(
  p_transaction_id UUID, 
  p_actor VARCHAR(255) DEFAULT 'Unknown'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  v_txn transactions%ROWTYPE; 
  v_balance_change DECIMAL(15,2);
BEGIN
  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id AND is_deleted = FALSE;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Transaction not found or already deleted'; 
  END IF;
  
  UPDATE transactions SET is_deleted = TRUE, updated_at = NOW() WHERE id = p_transaction_id;
  
  v_balance_change := CASE WHEN v_txn.type = 'INCOME' THEN -v_txn.amount ELSE v_txn.amount END;
  UPDATE accounts SET current_balance = current_balance + v_balance_change WHERE id = v_txn.account_id;
  
  INSERT INTO audit_logs (transaction_id, action, actor, old_data)
  VALUES (p_transaction_id, 'SOFT_DELETED', p_actor, row_to_json(v_txn));

  RETURN jsonb_build_object('success', true);
END; 
$$;

-- ==========================================
-- 3. MISSING RPC FUNCTIONS
-- ==========================================

-- Create Purchase Order (Returns full row for API DTO compatibility)
CREATE OR REPLACE FUNCTION create_purchase_order(
  p_vendor_name VARCHAR(255), 
  p_expected_amount DECIMAL(15,2), 
  p_expected_date DATE, 
  p_actor VARCHAR(255) DEFAULT 'Unknown'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  v_new_po purchase_orders%ROWTYPE;
BEGIN
  IF p_expected_amount <= 0 THEN
    RAISE EXCEPTION 'Expected amount must be greater than 0';
  END IF;

  INSERT INTO purchase_orders (vendor_name, total_expected_amount, expected_delivery_date, created_by)
  VALUES (p_vendor_name, p_expected_amount, p_expected_date, p_actor) 
  RETURNING * INTO v_new_po;

  RETURN row_to_json(v_new_po);
END; 
$$;

-- Log Goods Receipt (Returns status and total matching api.ts)
CREATE OR REPLACE FUNCTION log_goods_receipt(
  p_po_id UUID, 
  p_received_amount DECIMAL(15,2), 
  p_actor VARCHAR(255) DEFAULT 'Unknown',
  p_challan_number VARCHAR(100) DEFAULT NULL,
  p_receipt_image_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  v_po purchase_orders%ROWTYPE; 
  v_new_total DECIMAL(15,2); 
  v_new_status po_status;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Purchase Order not found'; 
  END IF;

  IF p_received_amount <= 0 THEN
    RAISE EXCEPTION 'Received amount must be greater than 0';
  END IF;
  
  v_new_total := v_po.total_received_amount + p_received_amount;
  v_new_status := CASE 
    WHEN v_new_total >= v_po.total_expected_amount THEN 'COMPLETE'::po_status 
    ELSE 'PARTIAL'::po_status 
  END;

  UPDATE purchase_orders 
  SET total_received_amount = v_new_total, status = v_new_status 
  WHERE id = p_po_id;

  INSERT INTO goods_receipts (
    purchase_order_id, received_amount, received_date, notes, received_by, challan_number, receipt_image_url
  ) VALUES (
    p_po_id, p_received_amount, CURRENT_DATE, p_notes, p_actor, p_challan_number, p_receipt_image_url
  );

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'new_total', v_new_total);
END; 
$$;

-- Close Month (Strict finality, handles loss months, prevents overdrafts, returns closure_id)
CREATE OR REPLACE FUNCTION close_month(
  p_month INT, 
  p_year INT, 
  p_net_profit DECIMAL(15,2), 
  p_alloc_opex DECIMAL(15,2), 
  p_alloc_salaries DECIMAL(15,2), 
  p_alloc_reinvestment DECIMAL(15,2), 
  p_alloc_partner_payout DECIMAL(15,2), 
  p_payout_account_id UUID DEFAULT NULL, 
  p_actor VARCHAR(255) DEFAULT 'Unknown'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  v_closure_id UUID;
  v_account_balance DECIMAL(15,2); 
  v_total_cash DECIMAL(15,2); 
  v_inventory_val DECIMAL(15,2); 
  v_partner_cat_id UUID; 
  v_existing_status VARCHAR(20);
BEGIN
  PERFORM pg_advisory_xact_lock(p_year * 100 + p_month);

  SELECT status INTO v_existing_status FROM monthly_closures WHERE month = p_month AND year = p_year;
  IF v_existing_status = 'LOCKED' THEN 
    RAISE EXCEPTION 'Month %-% is already locked.', p_month, p_year; 
  END IF;

  IF p_alloc_partner_payout > 0 THEN
    IF p_payout_account_id IS NULL THEN
      RAISE EXCEPTION 'Payout account ID required for partner withdrawal';
    END IF;

    SELECT current_balance INTO v_account_balance FROM accounts WHERE id = p_payout_account_id;
    IF v_account_balance IS NULL THEN
      RAISE EXCEPTION 'Selected account does not exist';
    END IF;
    IF p_alloc_partner_payout > v_account_balance THEN 
      RAISE EXCEPTION 'Overdraft prevented: Payout (₹%) exceeds account balance (₹%)', p_alloc_partner_payout, v_account_balance; 
    END IF;
  END IF;

  INSERT INTO monthly_closures (
    month, year, status, net_profit, alloc_opex, alloc_salaries, alloc_reinvestment, alloc_partner_payout, locked_at, locked_by
  ) VALUES (
    p_month, p_year, 'LOCKED', p_net_profit, p_alloc_opex, p_alloc_salaries, p_alloc_reinvestment, p_alloc_partner_payout, NOW(), p_actor
  )
  ON CONFLICT (month, year) DO UPDATE SET 
    status = 'LOCKED', 
    net_profit = EXCLUDED.net_profit, 
    alloc_opex = EXCLUDED.alloc_opex, 
    alloc_salaries = EXCLUDED.alloc_salaries, 
    alloc_reinvestment = EXCLUDED.alloc_reinvestment, 
    alloc_partner_payout = EXCLUDED.alloc_partner_payout, 
    locked_at = NOW(), 
    locked_by = EXCLUDED.locked_by
  RETURNING id INTO v_closure_id;

  IF p_alloc_partner_payout > 0 THEN
    SELECT id INTO v_partner_cat_id FROM categories WHERE name = 'Partner Withdrawal' LIMIT 1;
    IF v_partner_cat_id IS NOT NULL THEN
      PERFORM create_financial_transaction(
        p_payout_account_id, v_partner_cat_id, p_alloc_partner_payout, 'EXPENSE', CURRENT_DATE, p_actor, 'Month-End Partner Payout'
      );
    END IF;
  END IF;

  SELECT COALESCE(SUM(current_balance), 0) INTO v_total_cash FROM accounts;
  SELECT COALESCE(inventory_value, 0) INTO v_inventory_val FROM monthly_snapshots ORDER BY snapshot_date DESC LIMIT 1;

  INSERT INTO monthly_snapshots (month, year, cash_balance, inventory_value, total_business_value)
  VALUES (p_month, p_year, v_total_cash, v_inventory_val, (v_total_cash + v_inventory_val))
  ON CONFLICT (month, year) DO UPDATE SET 
    cash_balance = EXCLUDED.cash_balance, 
    inventory_value = EXCLUDED.inventory_value, 
    total_business_value = EXCLUDED.total_business_value,
    snapshot_date = now();

  RETURN jsonb_build_object('success', true, 'closure_id', v_closure_id);
END; 
$$;
