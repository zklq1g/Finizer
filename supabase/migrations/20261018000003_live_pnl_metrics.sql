-- 1. Ensure inventory_items table exists for valuation
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku text UNIQUE NOT NULL,
    name text NOT NULL,
    quantity integer NOT NULL DEFAULT 0,
    cost_price numeric(12,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Ensure accounts has is_active
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Compatibility view in case financial_transactions is referenced
CREATE OR REPLACE VIEW public.financial_transactions AS 
SELECT 
    id,
    account_id,
    category_id,
    amount,
    type::text as type,
    date as transaction_date,
    description,
    vendor_gst_number,
    receipt_image_url,
    is_deleted,
    created_at,
    updated_at
FROM public.transactions;

-- 2. Create the aggregation RPC
CREATE OR REPLACE FUNCTION public.get_financial_metrics(p_start_date date, p_end_date date)
RETURNS TABLE (
    total_cash numeric,
    inventory_value numeric,
    monthly_income numeric,
    monthly_expense numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv numeric;
BEGIN
    SELECT COALESCE(SUM(ii.quantity * ii.cost_price), 0) INTO v_inv FROM public.inventory_items ii;
    IF v_inv = 0 THEN
        SELECT COALESCE(ms.inventory_value, 0) INTO v_inv FROM public.monthly_snapshots ms ORDER BY ms.snapshot_date DESC LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COALESCE(SUM(a.current_balance), 0) 
         FROM public.accounts a 
         WHERE a.is_active = true) as total_cash,
         
        COALESCE(v_inv, 0) as inventory_value,
         
        (SELECT COALESCE(SUM(t.amount), 0) 
         FROM public.transactions t 
         WHERE t.type = 'INCOME' 
           AND t.date >= p_start_date 
           AND t.date <= p_end_date 
           AND t.is_deleted = false) as monthly_income,
         
        (SELECT COALESCE(SUM(t.amount), 0) 
         FROM public.transactions t 
         WHERE t.type = 'EXPENSE' 
           AND t.date >= p_start_date 
           AND t.date <= p_end_date 
           AND t.is_deleted = false) as monthly_expense;
END;
$$;
