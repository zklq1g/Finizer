-- ============================================================================
-- Migration: 20261020000000_deliveries_bilty_and_lock.sql
-- Description: Adds logistics evidence (Bilty/LR, photos, actor) and atomic 
--              row locking to the goods receipt verification system.
-- ============================================================================

-- 1. Add expected delivery date to Purchase Orders (for logistics aging / overdue metric)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;

-- 2. Add logistics evidence fields to Goods Receipts
ALTER TABLE goods_receipts 
ADD COLUMN IF NOT EXISTS challan_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT,
ADD COLUMN IF NOT EXISTS received_by VARCHAR(255);

-- 3. Upgraded Atomic RPC with Row Lock, Audit Trail, and Over-delivery Guard
CREATE OR REPLACE FUNCTION log_goods_receipt(
  p_po_id UUID,
  p_received_amount DECIMAL(15,2),
  p_actor VARCHAR(255),
  p_challan_number VARCHAR(100) DEFAULT NULL,
  p_receipt_image_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_po purchase_orders%ROWTYPE;
  v_new_total DECIMAL(15,2);
  v_new_status po_status;
BEGIN
  -- 1. Row Lock to prevent concurrent double-entry on mobile network jitter
  SELECT * INTO v_po 
  FROM purchase_orders 
  WHERE id = p_po_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase Order not found';
  END IF;

  -- 2. Guard against extreme over-receiving (> 10% buffer)
  IF (v_po.total_received_amount + p_received_amount) > (v_po.total_expected_amount * 1.10) THEN
    RAISE EXCEPTION 'Received amount exceeds expected order by more than 10 percent buffer.';
  END IF;

  v_new_total := v_po.total_received_amount + p_received_amount;
  v_new_status := CASE 
    WHEN v_new_total >= v_po.total_expected_amount THEN 'COMPLETE'::po_status 
    ELSE 'PARTIAL'::po_status 
  END;

  -- 3. Update PO atomically
  UPDATE purchase_orders 
  SET total_received_amount = v_new_total, 
      status = v_new_status,
      updated_at = NOW()
  WHERE id = p_po_id;

  -- 4. Insert Receipt Record with Challan & Evidence
  INSERT INTO goods_receipts (
    purchase_order_id, 
    received_amount, 
    received_date, 
    challan_number, 
    receipt_image_url, 
    notes, 
    received_by
  ) VALUES (
    p_po_id, 
    p_received_amount, 
    CURRENT_DATE, 
    p_challan_number, 
    p_receipt_image_url, 
    p_notes, 
    p_actor
  );

  -- 5. Auto-write to Immutable Audit Log
  INSERT INTO audit_logs (transaction_id, action, actor, old_data, new_data)
  VALUES (
    p_po_id, 
    'EDITED', 
    p_actor,
    jsonb_build_object(
      'vendor', v_po.vendor_name, 
      'received', v_po.total_received_amount, 
      'status', v_po.status
    ),
    jsonb_build_object(
      'vendor', v_po.vendor_name, 
      'received', v_new_total, 
      'status', v_new_status, 
      'challan', p_challan_number
    )
  );

  RETURN jsonb_build_object(
    'success', true, 
    'new_status', v_new_status, 
    'new_total', v_new_total
  );
END;
$$;
