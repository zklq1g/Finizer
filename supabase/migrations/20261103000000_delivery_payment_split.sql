-- ============================================================================
-- Migration: 20261103000000_delivery_payment_split.sql
-- Description: Adds support for partial/advance vendor payments.
--              - Adds total_order_amount (full bill) and amount_paid (paid so far)
--              - Updates create_vendor_order to support advance payments
--              - Adds pay_vendor_balance RPC for clearing remaining dues
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADD PAYMENT TRACKING COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────
-- total_order_amount = the full vendor bill (e.g., ₹50,000)
-- amount_paid = how much has been paid so far (e.g., ₹20,000 advance)
-- When amount_paid >= total_order_amount, the vendor is fully paid.

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_order_amount DECIMAL(15,2);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0;

-- Backfill existing orders: they were all created as 100% upfront,
-- so total_order_amount = total_expected_amount and amount_paid = total_expected_amount
UPDATE purchase_orders
SET total_order_amount = total_expected_amount,
    amount_paid = total_expected_amount
WHERE total_order_amount IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. UPDATED CREATE VENDOR ORDER RPC
--    Now accepts total_order_amount and an initial payment (advance).
--    If advance < total, the order is flagged as partially paid.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_vendor_order(
  p_vendor_name       VARCHAR(255),
  p_vendor_mobile     VARCHAR(20) DEFAULT NULL,
  p_vendor_location   VARCHAR(255) DEFAULT NULL,
  p_amount_paid       DECIMAL(15,2) DEFAULT 0,
  p_payment_account_id UUID DEFAULT NULL,
  p_purchase_details  TEXT DEFAULT NULL,
  p_expected_date     DATE DEFAULT NULL,
  p_actor             VARCHAR(255) DEFAULT 'Store Owner',
  p_total_order_amount DECIMAL(15,2) DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_po         purchase_orders%ROWTYPE;
  v_inv_cat_id     UUID;
  v_total          DECIMAL(15,2);
  v_advance        DECIMAL(15,2);
BEGIN
  -- Determine total order amount (if not given, assume = amount_paid i.e., 100% upfront)
  v_total := COALESCE(p_total_order_amount, p_amount_paid);
  v_advance := COALESCE(p_amount_paid, v_total);

  -- Validations
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Total order amount must be greater than 0';
  END IF;
  IF v_advance < 0 THEN
    RAISE EXCEPTION 'Payment amount cannot be negative';
  END IF;
  IF v_advance > v_total THEN
    RAISE EXCEPTION 'Payment amount cannot exceed total order amount';
  END IF;
  IF TRIM(COALESCE(p_vendor_name, '')) = '' THEN
    RAISE EXCEPTION 'Vendor name is required';
  END IF;
  IF v_advance > 0 AND p_payment_account_id IS NULL THEN
    RAISE EXCEPTION 'Payment account is required when making a payment';
  END IF;

  -- 1. Create the vendor order record
  INSERT INTO purchase_orders (
    vendor_name, total_expected_amount, total_received_amount,
    status, expected_delivery_date, created_by,
    vendor_mobile, vendor_location, purchase_details,
    payment_account_id, transport_charges,
    total_order_amount, amount_paid
  ) VALUES (
    TRIM(p_vendor_name), v_total, 0.00,
    'PENDING', p_expected_date, p_actor,
    NULLIF(TRIM(COALESCE(p_vendor_mobile, '')), ''),
    NULLIF(TRIM(COALESCE(p_vendor_location, '')), ''),
    NULLIF(TRIM(COALESCE(p_purchase_details, '')), ''),
    p_payment_account_id, 0,
    v_total, v_advance
  ) RETURNING * INTO v_new_po;

  -- 2. Auto-create EXPENSE transaction for the initial payment (if > 0)
  IF v_advance > 0 AND p_payment_account_id IS NOT NULL THEN
    SELECT id INTO v_inv_cat_id
    FROM categories
    WHERE name = 'Inventory Purchase' AND is_system_default = TRUE
    LIMIT 1;

    IF v_inv_cat_id IS NULL THEN
      SELECT id INTO v_inv_cat_id
      FROM categories WHERE type = 'CAPITAL_EXPENSE' LIMIT 1;
    END IF;

    IF v_inv_cat_id IS NOT NULL THEN
      PERFORM create_financial_transaction(
        p_payment_account_id,
        v_inv_cat_id,
        v_advance,
        'EXPENSE',
        CURRENT_DATE,
        p_actor,
        CASE
          WHEN v_advance < v_total THEN
            format('Vendor Advance — %s (₹%s of ₹%s)', TRIM(p_vendor_name), v_advance, v_total)
          ELSE
            format('Vendor Order — %s', TRIM(p_vendor_name))
        END
      );
    END IF;
  END IF;

  -- 3. Audit log
  INSERT INTO audit_logs (transaction_id, action, actor, new_data)
  VALUES (
    v_new_po.id, 'CREATED', p_actor,
    jsonb_build_object(
      'type', 'VENDOR_ORDER',
      'vendor_name', TRIM(p_vendor_name),
      'total_order_amount', v_total,
      'amount_paid', v_advance,
      'payment_type', CASE WHEN v_advance >= v_total THEN 'FULL' ELSE 'ADVANCE' END,
      'vendor_mobile', p_vendor_mobile,
      'vendor_location', p_vendor_location
    )
  );

  RETURN row_to_json(v_new_po);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PAY VENDOR BALANCE RPC
--    Clears remaining balance on an order. Records expense transaction.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pay_vendor_balance(
  p_order_id         UUID,
  p_payment_amount   DECIMAL(15,2),
  p_payment_account_id UUID,
  p_actor            VARCHAR(255) DEFAULT 'Store Owner',
  p_notes            TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_po           purchase_orders%ROWTYPE;
  v_inv_cat_id   UUID;
  v_new_paid     DECIMAL(15,2);
  v_remaining    DECIMAL(15,2);
BEGIN
  -- Lock the order
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate
  IF p_payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;
  IF p_payment_account_id IS NULL THEN
    RAISE EXCEPTION 'Payment account is required';
  END IF;

  v_remaining := COALESCE(v_po.total_order_amount, v_po.total_expected_amount)
                 - COALESCE(v_po.amount_paid, 0);

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Vendor is already fully paid';
  END IF;

  IF p_payment_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment amount (₹%) exceeds remaining balance (₹%)', p_payment_amount, v_remaining;
  END IF;

  v_new_paid := COALESCE(v_po.amount_paid, 0) + p_payment_amount;

  -- 1. Update order
  UPDATE purchase_orders
  SET amount_paid = v_new_paid,
      payment_account_id = p_payment_account_id
  WHERE id = p_order_id;

  -- 2. Create expense transaction
  SELECT id INTO v_inv_cat_id
  FROM categories
  WHERE name = 'Inventory Purchase' AND is_system_default = TRUE
  LIMIT 1;

  IF v_inv_cat_id IS NULL THEN
    SELECT id INTO v_inv_cat_id
    FROM categories WHERE type = 'CAPITAL_EXPENSE' LIMIT 1;
  END IF;

  IF v_inv_cat_id IS NOT NULL THEN
    PERFORM create_financial_transaction(
      p_payment_account_id,
      v_inv_cat_id,
      p_payment_amount,
      'EXPENSE',
      CURRENT_DATE,
      p_actor,
      CASE
        WHEN v_new_paid >= COALESCE(v_po.total_order_amount, v_po.total_expected_amount) THEN
          format('Vendor Balance Cleared — %s', v_po.vendor_name)
        ELSE
          format('Vendor Payment — %s (₹%s of ₹%s paid)',
            v_po.vendor_name, v_new_paid,
            COALESCE(v_po.total_order_amount, v_po.total_expected_amount))
      END
    );
  END IF;

  -- 3. Audit log
  INSERT INTO audit_logs (transaction_id, action, actor, old_data, new_data)
  VALUES (
    p_order_id, 'EDITED', p_actor,
    jsonb_build_object('amount_paid', COALESCE(v_po.amount_paid, 0)),
    jsonb_build_object(
      'amount_paid', v_new_paid,
      'payment_amount', p_payment_amount,
      'payment_account_id', p_payment_account_id,
      'notes', p_notes,
      'fully_paid', v_new_paid >= COALESCE(v_po.total_order_amount, v_po.total_expected_amount)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_amount_paid', v_new_paid,
    'remaining', COALESCE(v_po.total_order_amount, v_po.total_expected_amount) - v_new_paid,
    'fully_paid', v_new_paid >= COALESCE(v_po.total_order_amount, v_po.total_expected_amount)
  );
END;
$$;
