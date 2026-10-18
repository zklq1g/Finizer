-- ========================================================
-- 1. ATOMIC TRANSACTION CREATION
-- ========================================================
CREATE OR REPLACE FUNCTION create_financial_transaction(
  p_account_id UUID,
  p_category_id UUID,
  p_amount DECIMAL(15,2),
  p_type transaction_type,
  p_date DATE,
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

  -- 3. Write Immutable Audit Log
  INSERT INTO audit_logs (transaction_id, action, new_data)
  VALUES (
    v_new_transaction.id, 
    'CREATED', 
    row_to_json(v_new_transaction)
  );

  RETURN row_to_json(v_new_transaction);
END;
$$;

-- ========================================================
-- 2. ATOMIC SOFT DELETE (Reverses balance & logs audit)
-- ========================================================
CREATE OR REPLACE FUNCTION soft_delete_transaction(
  p_transaction_id UUID
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

  -- 3. Log audit event
  INSERT INTO audit_logs (transaction_id, action, old_data)
  VALUES (
    p_transaction_id, 
    'SOFT_DELETED', 
    row_to_json(v_old_transaction)
  );

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$;

-- ========================================================
-- 3. ATOMIC EDIT TRANSACTION (Adjusts balance delta & logs audit)
-- ========================================================
CREATE OR REPLACE FUNCTION edit_financial_transaction(
  p_transaction_id UUID,
  p_account_id UUID,
  p_category_id UUID,
  p_amount DECIMAL(15,2),
  p_type transaction_type,
  p_date DATE,
  p_description TEXT DEFAULT NULL,
  p_vendor_gst_number VARCHAR(50) DEFAULT NULL,
  p_receipt_image_url TEXT DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_old_transaction transactions%ROWTYPE;
  v_updated_transaction transactions%ROWTYPE;
  v_old_impact DECIMAL(15,2);
  v_new_impact DECIMAL(15,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  SELECT * INTO v_old_transaction 
  FROM transactions 
  WHERE id = p_transaction_id AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active transaction not found';
  END IF;

  -- 1. Calculate old balance impact
  IF v_old_transaction.type = 'INCOME' THEN
    v_old_impact := v_old_transaction.amount;
  ELSE
    v_old_impact := -v_old_transaction.amount;
  END IF;

  -- 2. Calculate new balance impact
  IF p_type = 'INCOME' THEN
    v_new_impact := p_amount;
  ELSE
    v_new_impact := -p_amount;
  END IF;

  -- 3. Update account balances (handle case if account changed)
  IF v_old_transaction.account_id = p_account_id THEN
    UPDATE accounts 
    SET current_balance = current_balance - v_old_impact + v_new_impact 
    WHERE id = p_account_id;
  ELSE
    UPDATE accounts 
    SET current_balance = current_balance - v_old_impact 
    WHERE id = v_old_transaction.account_id;

    UPDATE accounts 
    SET current_balance = current_balance + v_new_impact 
    WHERE id = p_account_id;
  END IF;

  -- 4. Update transaction
  UPDATE transactions 
  SET 
    account_id = p_account_id,
    category_id = p_category_id,
    amount = p_amount,
    type = p_type,
    date = p_date,
    description = p_description,
    vendor_gst_number = p_vendor_gst_number,
    receipt_image_url = p_receipt_image_url,
    updated_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_updated_transaction;

  -- 5. Record edit in audit log
  INSERT INTO audit_logs (transaction_id, action, old_data, new_data)
  VALUES (
    p_transaction_id, 
    'EDITED', 
    row_to_json(v_old_transaction),
    row_to_json(v_updated_transaction)
  );

  RETURN row_to_json(v_updated_transaction);
END;
$$;
