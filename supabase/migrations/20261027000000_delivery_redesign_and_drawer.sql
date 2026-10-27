-- ============================================================================
-- Migration: 20261027000000_delivery_redesign_and_drawer.sql
-- Description: Redesigns the delivery system to match diary-based vendor order
--              workflow (upfront payment, parcel arrival tracking, transport
--              charges). Adds Cash Drawer Withdrawal category.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADD DIARY-STYLE FIELDS TO PURCHASE ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_mobile VARCHAR(20);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_location VARCHAR(255);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS purchase_details TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES accounts(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS arrival_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS transport_charges DECIMAL(15,2) DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADD TRANSPORT CHARGES TO GOODS RECEIPTS (per-arrival cost)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS transport_charges DECIMAL(15,2) DEFAULT 0;

-- Relax the received_amount constraint — in the new model we track parcels,
-- not partial money. Existing data is unaffected.
DO $$
BEGIN
  ALTER TABLE goods_receipts DROP CONSTRAINT IF EXISTS goods_receipts_received_amount_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
ALTER TABLE goods_receipts ALTER COLUMN received_amount DROP NOT NULL;
ALTER TABLE goods_receipts ALTER COLUMN received_amount SET DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CASH DRAWER WITHDRAWAL CATEGORY
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO categories (name, type, is_system_default, is_active)
VALUES ('Cash Drawer Withdrawal', 'WITHDRAWAL', true, true)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CREATE VENDOR ORDER RPC
--    Creates the order record AND auto-logs an expense transaction for the
--    upfront payment. One tap in the UI = two atomic DB writes.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_vendor_order(
  p_vendor_name     VARCHAR(255),
  p_vendor_mobile   VARCHAR(20),
  p_vendor_location VARCHAR(255),
  p_amount_paid     DECIMAL(15,2),
  p_payment_account_id UUID,
  p_purchase_details TEXT,
  p_expected_date   DATE,
  p_actor           VARCHAR(255)
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_po     purchase_orders%ROWTYPE;
  v_inv_cat_id UUID;
BEGIN
  -- Validations
  IF p_amount_paid <= 0 THEN
    RAISE EXCEPTION 'Amount paid must be greater than 0';
  END IF;
  IF TRIM(COALESCE(p_vendor_name, '')) = '' THEN
    RAISE EXCEPTION 'Vendor name is required';
  END IF;
  IF p_payment_account_id IS NULL THEN
    RAISE EXCEPTION 'Payment account is required';
  END IF;

  -- 1. Create the vendor order record
  INSERT INTO purchase_orders (
    vendor_name, total_expected_amount, total_received_amount,
    status, expected_delivery_date, created_by,
    vendor_mobile, vendor_location, purchase_details,
    payment_account_id, transport_charges
  ) VALUES (
    TRIM(p_vendor_name), p_amount_paid, 0.00,
    'PENDING', p_expected_date, p_actor,
    NULLIF(TRIM(COALESCE(p_vendor_mobile, '')), ''),
    NULLIF(TRIM(COALESCE(p_vendor_location, '')), ''),
    NULLIF(TRIM(COALESCE(p_purchase_details, '')), ''),
    p_payment_account_id, 0
  ) RETURNING * INTO v_new_po;

  -- 2. Auto-create EXPENSE transaction for the upfront vendor payment
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
      p_amount_paid,
      'EXPENSE',
      CURRENT_DATE,
      p_actor,
      format('Vendor Order — %s', TRIM(p_vendor_name))
    );
  END IF;

  -- 3. Audit log
  INSERT INTO audit_logs (transaction_id, action, actor, new_data)
  VALUES (
    v_new_po.id, 'CREATED', p_actor,
    jsonb_build_object(
      'type', 'VENDOR_ORDER',
      'vendor_name', TRIM(p_vendor_name),
      'amount_paid', p_amount_paid,
      'vendor_mobile', p_vendor_mobile,
      'vendor_location', p_vendor_location
    )
  );

  RETURN row_to_json(v_new_po);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. LOG PARCEL ARRIVAL RPC
--    Logs an arrival, optionally auto-creates transport expense, and updates
--    the order status. Supports multi-parcel arrivals.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_parcel_arrival(
  p_order_id            UUID,
  p_arrival_date        DATE,
  p_transport_charges   DECIMAL(15,2) DEFAULT 0,
  p_transport_account_id UUID DEFAULT NULL,
  p_notes               TEXT DEFAULT NULL,
  p_receipt_image_url   TEXT DEFAULT NULL,
  p_is_last_parcel      BOOLEAN DEFAULT FALSE,
  p_actor               VARCHAR(255) DEFAULT 'Store Owner'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_po               purchase_orders%ROWTYPE;
  v_new_status        po_status;
  v_transport_cat_id  UUID;
BEGIN
  -- Row-lock the order to prevent concurrent arrivals
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_po.status = 'COMPLETE' THEN
    RAISE EXCEPTION 'Order is already marked as fully arrived';
  END IF;

  -- Determine new status
  IF p_is_last_parcel THEN
    v_new_status := 'COMPLETE'::po_status;
  ELSE
    v_new_status := 'PARTIAL'::po_status;
  END IF;

  -- 1. Update order record
  UPDATE purchase_orders
  SET status = v_new_status,
      arrival_date = CASE WHEN p_is_last_parcel THEN p_arrival_date ELSE arrival_date END,
      transport_charges = COALESCE(transport_charges, 0) + COALESCE(p_transport_charges, 0)
  WHERE id = p_order_id;

  -- 2. Insert arrival record into goods_receipts
  INSERT INTO goods_receipts (
    purchase_order_id, received_amount, received_date,
    transport_charges, notes, receipt_image_url, received_by
  ) VALUES (
    p_order_id, 0, p_arrival_date,
    COALESCE(p_transport_charges, 0), p_notes, p_receipt_image_url, p_actor
  );

  -- 3. Auto-create transport expense if charges > 0
  IF COALESCE(p_transport_charges, 0) > 0 AND p_transport_account_id IS NOT NULL THEN
    SELECT id INTO v_transport_cat_id
    FROM categories
    WHERE name = 'Transportation & Petrol'
    LIMIT 1;

    IF v_transport_cat_id IS NOT NULL THEN
      PERFORM create_financial_transaction(
        p_transport_account_id,
        v_transport_cat_id,
        p_transport_charges,
        'EXPENSE',
        p_arrival_date,
        p_actor,
        format('Transport — %s', v_po.vendor_name)
      );
    END IF;
  END IF;

  -- 4. Audit log
  INSERT INTO audit_logs (transaction_id, action, actor, old_data, new_data)
  VALUES (
    p_order_id, 'EDITED', p_actor,
    jsonb_build_object('status', v_po.status::text),
    jsonb_build_object(
      'status', v_new_status::text,
      'arrival_date', p_arrival_date,
      'transport_charges', COALESCE(p_transport_charges, 0),
      'is_last_parcel', p_is_last_parcel
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_status', v_new_status::text,
    'transport_recorded', COALESCE(p_transport_charges, 0) > 0
  );
END;
$$;
