-- ============================================================================
-- Migration: 20261023000000_actor_patch_and_po_rpc.sql
-- Description: Adds actor attribution to audit_logs and transactions, creates
--              the atomic create_purchase_order RPC, and enhances soft_delete_transaction.
-- ============================================================================

-- 1. Patch audit_logs for flexible entity logging and actor tracking
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor VARCHAR(255) DEFAULT 'Store Owner';
ALTER TABLE audit_logs ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_transaction_id_fkey;

-- 2. Add created_by to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'Store Owner';

-- 3. Upgrade create_financial_transaction to accept and record p_actor
CREATE OR REPLACE FUNCTION create_financial_transaction(
  p_account_id UUID,
  p_category_id UUID,
  p_amount DECIMAL(15,2),
  p_type transaction_type,
  p_date DATE,
  p_actor VARCHAR(255),
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

  -- 1. Create Transaction
  INSERT INTO transactions (
    account_id, category_id, amount, type, date, description, vendor_gst_number, receipt_image_url
  ) VALUES (
    p_account_id, p_category_id, p_amount, p_type, p_date, p_description, p_vendor_gst_number, p_receipt_image_url
  ) RETURNING * INTO v_new_transaction;

  -- 2. Update Account Balance
  IF p_type = 'INCOME' THEN
    v_balance_change := p_amount;
  ELSE
    v_balance_change := -p_amount;
  END IF;

  UPDATE accounts 
  SET current_balance = current_balance + v_balance_change 
  WHERE id = p_account_id;

  -- 3. Write Immutable Audit Log with Actor
  INSERT INTO audit_logs (transaction_id, action, actor, new_data)
  VALUES (
    v_new_transaction.id, 
    'CREATED', 
    p_actor,
    row_to_json(v_new_transaction)
  );

  RETURN row_to_json(v_new_transaction);
END;
$$;

-- 4. Upgrade soft_delete_transaction to log actor
CREATE OR REPLACE FUNCTION soft_delete_transaction(
  p_transaction_id UUID,
  p_actor VARCHAR(255) DEFAULT 'Store Owner'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_old_transaction transactions%ROWTYPE;
  v_reversal_change DECIMAL(15,2);
BEGIN
  SELECT * INTO v_old_transaction 
  FROM transactions 
  WHERE id = p_transaction_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active transaction not found';
  END IF;

  -- 1. Mark as soft-deleted
  UPDATE transactions 
  SET is_deleted = TRUE, updated_at = now()
  WHERE id = p_transaction_id;

  -- 2. Reverse the account balance impact
  IF v_old_transaction.type = 'INCOME' THEN
    v_reversal_change := -v_old_transaction.amount;
  ELSE
    v_reversal_change := v_old_transaction.amount;
  END IF;

  UPDATE accounts 
  SET current_balance = current_balance + v_reversal_change 
  WHERE id = v_old_transaction.account_id;

  -- 3. Log audit event with Actor
  INSERT INTO audit_logs (transaction_id, action, actor, old_data)
  VALUES (
    p_transaction_id, 
    'SOFT_DELETED', 
    p_actor,
    row_to_json(v_old_transaction)
  );

  RETURN row_to_json(v_old_transaction);
END;
$$;

-- 5. Atomic Purchase Order creation with validation and audit log
CREATE OR REPLACE FUNCTION create_purchase_order(
  p_vendor_name VARCHAR(255),
  p_expected_amount DECIMAL(15,2),
  p_expected_date DATE,
  p_actor VARCHAR(255)
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_new_po purchase_orders%ROWTYPE;
BEGIN
  IF p_expected_amount <= 0 THEN
    RAISE EXCEPTION 'Expected amount must be greater than 0';
  END IF;

  IF TRIM(p_vendor_name) = '' THEN
    RAISE EXCEPTION 'Vendor name is required';
  END IF;

  INSERT INTO purchase_orders (
    vendor_name,
    total_expected_amount,
    total_received_amount,
    status,
    expected_delivery_date,
    created_by
  ) VALUES (
    TRIM(p_vendor_name),
    p_expected_amount,
    0.00,
    'PENDING',
    p_expected_date,
    p_actor
  ) RETURNING * INTO v_new_po;

  -- Write to audit log
  INSERT INTO audit_logs (transaction_id, action, actor, new_data)
  VALUES (
    v_new_po.id,
    'CREATED',
    p_actor,
    jsonb_build_object(
      'type', 'PURCHASE_ORDER',
      'vendor_name', TRIM(p_vendor_name),
      'expected_amount', p_expected_amount,
      'expected_date', p_expected_date
    )
  );

  RETURN row_to_json(v_new_po);
END;
$$;
