-- ============================================================================
-- Migration: 20261020000001_monthly_closures_and_snapshots.sql
-- Description: Establishes monthly financial closure table and atomic close_month 
--              RPC with scoped locking, strict idempotency, and account overdraft checks.
-- ============================================================================

-- 1. Monthly Closures Table (Virtual profit designations, retaining cash-basis integrity)
CREATE TABLE IF NOT EXISTS monthly_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2020),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'LOCKED')),
    net_profit DECIMAL(15,2) NOT NULL,
    alloc_opex DECIMAL(15,2) DEFAULT 0.00,
    alloc_salaries DECIMAL(15,2) DEFAULT 0.00,
    alloc_reinvestment DECIMAL(15,2) DEFAULT 0.00,
    alloc_partner_payout DECIMAL(15,2) DEFAULT 0.00,
    payout_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(month, year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_closures_period ON monthly_closures(year DESC, month DESC);

-- 2. The Atomic Month-End Closure RPC
CREATE OR REPLACE FUNCTION close_month(
  p_month INT,
  p_year INT,
  p_net_profit DECIMAL(15,2),
  p_alloc_opex DECIMAL(15,2),
  p_alloc_salaries DECIMAL(15,2),
  p_alloc_reinvestment DECIMAL(15,2),
  p_alloc_partner_payout DECIMAL(15,2),
  p_payout_account_id UUID,
  p_actor VARCHAR(255)
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_account_balance DECIMAL(15,2);
  v_total_cash DECIMAL(15,2);
  v_inventory_val DECIMAL(15,2);
  v_partner_cat_id UUID;
  v_existing_status VARCHAR(20);
BEGIN
  -- FIX #7: Scoped Concurrency Advisory Lock (Specific to this exact month/year)
  PERFORM pg_advisory_xact_lock(p_year * 100 + p_month);

  -- FIX #2: Strict Finality Guard (Month can only be closed once)
  SELECT status INTO v_existing_status 
  FROM monthly_closures 
  WHERE month = p_month AND year = p_year;

  IF v_existing_status = 'LOCKED' THEN
    RAISE EXCEPTION 'Month %/% is already locked. Any late adjustments must be recorded in the current active month.', p_month, p_year;
  END IF;

  -- FIX #1: Account-Level Overdraft Check (Only runs when physical payout > 0)
  IF p_alloc_partner_payout > 0 THEN
    IF p_payout_account_id IS NULL THEN
      RAISE EXCEPTION 'A valid payout account must be specified for partner cash withdrawal.';
    END IF;

    SELECT current_balance INTO v_account_balance 
    FROM accounts 
    WHERE id = p_payout_account_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Specified payout account does not exist.';
    END IF;

    IF p_alloc_partner_payout > v_account_balance THEN
      RAISE EXCEPTION 'Overdraft prevented: Partner payout (₹%) exceeds selected account balance (₹%).', 
        p_alloc_partner_payout, v_account_balance;
    END IF;
  END IF;

  -- 1. Insert or Lock Closure Record (Handles both Profit and Loss Months)
  INSERT INTO monthly_closures (
    month, year, status, net_profit, alloc_opex, alloc_salaries, 
    alloc_reinvestment, alloc_partner_payout, payout_account_id, locked_at, locked_by
  ) VALUES (
    p_month, p_year, 'LOCKED', p_net_profit, p_alloc_opex, p_alloc_salaries, 
    p_alloc_reinvestment, p_alloc_partner_payout, p_payout_account_id, NOW(), p_actor
  )
  ON CONFLICT (month, year) DO UPDATE SET
    status = 'LOCKED',
    net_profit = EXCLUDED.net_profit,
    alloc_opex = EXCLUDED.alloc_opex,
    alloc_salaries = EXCLUDED.alloc_salaries,
    alloc_reinvestment = EXCLUDED.alloc_reinvestment,
    alloc_partner_payout = EXCLUDED.alloc_partner_payout,
    payout_account_id = EXCLUDED.payout_account_id,
    locked_at = NOW(),
    locked_by = EXCLUDED.locked_by;

  -- 2. Execute Physical Cash Movement (ONLY for actual Partner Payouts)
  IF p_alloc_partner_payout > 0 THEN
    SELECT id INTO v_partner_cat_id 
    FROM categories 
    WHERE name = 'Partner Withdrawal' AND is_system_default = TRUE 
    LIMIT 1;

    IF v_partner_cat_id IS NULL THEN
      RAISE EXCEPTION 'System category "Partner Withdrawal" is missing from categories table.';
    END IF;

    PERFORM create_financial_transaction(
      p_payout_account_id, 
      v_partner_cat_id, 
      p_alloc_partner_payout, 
      'EXPENSE', 
      CURRENT_DATE, 
      p_actor, 
      format('Month-End Partner Payout (%s/%s)', p_month, p_year)
    );
  END IF;

  -- 3. Accurate Post-Closure Business Valuation Snapshot
  SELECT COALESCE(SUM(current_balance), 0) INTO v_total_cash FROM accounts;
  SELECT COALESCE(inventory_value, 0) INTO v_inventory_val 
  FROM monthly_snapshots 
  ORDER BY snapshot_date DESC 
  LIMIT 1;

  INSERT INTO monthly_snapshots (
    month, year, cash_balance, inventory_value, total_business_value
  ) VALUES (
    p_month, p_year, v_total_cash, v_inventory_val, (v_total_cash + v_inventory_val)
  )
  ON CONFLICT (month, year) DO UPDATE SET
    cash_balance = EXCLUDED.cash_balance,
    inventory_value = EXCLUDED.inventory_value,
    total_business_value = EXCLUDED.total_business_value,
    snapshot_date = NOW();

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Month %s/%s closed successfully.', p_month, p_year),
    'payout_recorded', p_alloc_partner_payout > 0
  );
END;
$$;
